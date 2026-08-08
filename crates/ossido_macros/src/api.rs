use proc_macro2::{Span, TokenStream};
use quote::quote;
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{FnArg, Ident, ItemFn, Pat};

use crate::utils::{
    crate_application_state_extractor, create_struct_fn_arg, import_main_application_state,
    is_logger_pat, params_argument, request_argument,
};

pub fn api_core(attrs: TokenStream, item: TokenStream) -> TokenStream {
    let item = match syn::parse2::<ItemFn>(item) {
        Ok(item) => item,
        Err(err) => return err.to_compile_error(),
    };
    let http_method = match syn::parse2::<Ident>(attrs) {
        Ok(method) => method.to_string().to_lowercase(),
        Err(err) => return err.to_compile_error(),
    };

    let api_fn_name = Ident::new(
        &format!("{http_method}_ossido_internal_api"),
        Span::call_site(),
    );

    let fn_name = &item.sig.ident;
    let return_type = &item.sig.output;

    // All arguments after the request, passed to the handler in declared order.
    let mut argument_names: Punctuated<Pat, Comma> = Punctuated::new();
    // The subset destructured from `ApplicationState` (i.e. not the `logger`).
    let mut state_field_names: Punctuated<Pat, Comma> = Punctuated::new();
    // Any `logger` parameters, provided automatically by the framework.
    let mut logger_pats: Vec<Pat> = Vec::new();

    // The first argument is always the request; the rest are application-state
    // fields or a `logger` (provided by the framework, no state needed).
    for (i, arg) in item.sig.inputs.iter().enumerate() {
        if i == 0 {
            continue;
        }
        if let FnArg::Typed(pat_type) = arg {
            let pat = *pat_type.pat.clone();
            argument_names.push(pat.clone());
            if is_logger_pat(&pat) {
                logger_pats.push(pat);
            } else {
                state_field_names.push(pat);
            }
        }
    }

    let mut axum_arguments: Punctuated<FnArg, Comma> = Punctuated::new();
    axum_arguments.push(params_argument());
    if !state_field_names.is_empty() {
        axum_arguments.push(create_struct_fn_arg());
    }
    axum_arguments.push(request_argument());

    let application_state_extractor = crate_application_state_extractor(state_field_names.clone());
    let application_state_import = import_main_application_state(state_field_names.clone());

    // Binds each declared `logger` parameter to a request-scoped logger (emitted
    // after `#modified_request` builds `req`).
    let logger_bindings = quote! {
        #( let #logger_pats = ossido::Logger::new(&req); )*
    };

    let modified_request = if http_method == "post"
        || http_method == "put"
        || http_method == "patch"
    {
        quote! {
            let (parts, body) = request.into_parts();
            let path = parts.uri.clone();
            let headers = parts.headers.clone();

            let body = ossido::axum::body::to_bytes(body, usize::MAX).await.unwrap_or(Vec::new().into()).to_vec();

            let req = ossido::Request::new(path, headers, params, Some(body));
        }
    } else {
        quote! {
           let pathname = request.uri();
           let headers = request.headers();

           let req = ossido::Request::new(request.uri().to_owned(), request.headers().to_owned(), params, None);
        }
    };

    quote! {
        #application_state_import

        #item

        pub async fn #api_fn_name(#axum_arguments)#return_type {

           #application_state_extractor

           #modified_request
           #logger_bindings

           #fn_name(req.clone(), #argument_names).await
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn expand(method: TokenStream, item: TokenStream) -> String {
        api_core(method, item).to_string().replace(' ', "")
    }

    #[test]
    fn a_get_api_names_the_fn_and_reads_the_request_without_a_body() {
        let out = expand(
            quote! { GET },
            quote! { async fn list(req: Request) -> Response { todo!() } },
        );
        assert!(out.contains("pubasyncfnget_ossido_internal_api"));
        // GET keeps the original function and does not read the request body.
        assert!(out.contains("asyncfnlist(req:Request)"));
        assert!(!out.contains("into_parts"));
        assert!(!out.contains("to_bytes"));
    }

    #[test]
    fn a_post_api_reads_the_request_body() {
        let out = expand(
            quote! { POST },
            quote! { async fn create(req: Request) -> Response { todo!() } },
        );
        assert!(out.contains("pubasyncfnpost_ossido_internal_api"));
        // Body methods consume and buffer the request body.
        assert!(out.contains("into_parts"));
        assert!(out.contains("to_bytes"));
    }

    #[test]
    fn put_and_patch_also_read_the_body() {
        for method in ["PUT", "PATCH"] {
            let token: TokenStream = method.parse().unwrap();
            let out = expand(
                token,
                quote! { async fn edit(req: Request) -> Response { todo!() } },
            );
            assert!(out.contains("into_parts"), "method {method} should buffer");
        }
    }

    #[test]
    fn a_stateful_api_extracts_application_state() {
        let out = expand(
            quote! { GET },
            quote! { async fn list(req: Request, db: Db) -> Response { todo!() } },
        );
        assert!(out.contains("ossido::axum::extract::State(state)"));
        assert!(out.contains("usecrate::ossido_main_state::ApplicationState"));
        assert!(out.contains("list(req.clone(),db)"));
    }

    #[test]
    fn a_logger_parameter_is_bound_in_an_api_handler() {
        let out = expand(
            quote! { GET },
            quote! { async fn list(req: Request, logger: Logger) -> Response { todo!() } },
        );
        assert!(out.contains("letlogger=ossido::Logger::new(&req)"));
        assert!(!out.contains("State(state)"));
    }

    #[test]
    fn an_invalid_http_method_becomes_a_compile_error() {
        // A numeric literal is not a valid method identifier.
        let out = expand(
            quote! { 123 },
            quote! { async fn list(req: Request) -> Response { todo!() } },
        );
        assert!(out.contains("compile_error!"));
    }
}
