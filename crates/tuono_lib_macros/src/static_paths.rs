use proc_macro2::TokenStream;
use quote::quote;
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{FnArg, ItemFn, Pat};

use crate::utils::{
    crate_application_state_extractor, create_struct_fn_arg, import_main_application_state,
    is_logger_pat, request_argument,
};

/// `#[tuono_lib::static_paths]` — mark the function in a dynamic route's
/// `page.rs` that enumerates the concrete pages to statically generate.
///
/// The function takes a borrowed `&mut StaticPaths` accumulator as its first
/// argument and `register`s one entry per page. Any further arguments are
/// injected exactly like a `#[handler]`: application-state fields (destructured
/// from `ApplicationState`) and a framework `logger`. It returns nothing.
///
/// The macro wraps it in an axum handler (`tuono_internal_static_paths`) that
/// the codegen mounts on an internal endpoint; `tuono build --static` queries it
/// to learn which URLs to render.
pub fn static_paths_core(_args: TokenStream, item: TokenStream) -> TokenStream {
    let item = match syn::parse2::<ItemFn>(item) {
        Ok(item) => item,
        Err(err) => return err.to_compile_error(),
    };

    let fn_name = &item.sig.ident;

    // Arguments after the first (the `&mut StaticPaths` accumulator) are either
    // application-state fields (destructured from `ApplicationState` by name) or
    // a `logger` (provided by the framework). This mirrors `#[handler]`, minus
    // the request — static-path enumeration has no incoming user request.
    let mut argument_names: Punctuated<Pat, Comma> = Punctuated::new();
    let mut state_field_names: Punctuated<Pat, Comma> = Punctuated::new();
    let mut logger_pats: Vec<Pat> = Vec::new();

    for (i, arg) in item.sig.inputs.iter().enumerate() {
        if i == 0 {
            // The `&mut StaticPaths` accumulator — supplied by the wrapper.
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

    // axum extractors: the application state (only when a state field is used)
    // and the request (only when a `logger` is declared, to bind it against).
    let needs_request = !logger_pats.is_empty();
    let mut axum_arguments: Punctuated<FnArg, Comma> = Punctuated::new();
    if !state_field_names.is_empty() {
        axum_arguments.push(create_struct_fn_arg());
    }
    if needs_request {
        axum_arguments.push(request_argument());
    }

    let application_state_extractor = crate_application_state_extractor(state_field_names.clone());
    let application_state_import = import_main_application_state(state_field_names.clone());

    // Static-path enumeration has no incoming user request, so a declared
    // `logger` is bound against a `Request` synthesised from the internal
    // endpoint call (its uri/headers, no route params).
    let logger_bindings = if needs_request {
        quote! {
            let req = tuono_lib::Request::new(
                request.uri().to_owned(),
                request.headers().to_owned(),
                std::collections::HashMap::new(),
                None,
            );
            #( let #logger_pats = tuono_lib::Logger::new(&req); )*
        }
    } else {
        quote! {}
    };

    quote! {
        #application_state_import

        #item

        pub async fn tuono_internal_static_paths(
            #axum_arguments
        ) -> impl tuono_lib::axum::response::IntoResponse {
            use tuono_lib::axum::response::IntoResponse as _;

            #application_state_extractor
            #logger_bindings

            let mut paths = tuono_lib::StaticPaths::new();
            #fn_name(&mut paths, #argument_names).await;
            tuono_lib::axum::Json(paths)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn expand(item: TokenStream) -> String {
        static_paths_core(TokenStream::new(), item)
            .to_string()
            .replace(' ', "")
    }

    #[test]
    fn generates_the_wrapper_and_preserves_the_original_fn() {
        let out = expand(quote! {
            async fn static_paths(paths: &mut StaticPaths) {}
        });
        assert!(out.contains("pubasyncfntuono_internal_static_paths"));
        // The accumulator is created and forwarded by reference.
        assert!(out.contains("letmutpaths=tuono_lib::StaticPaths::new()"));
        assert!(out.contains("static_paths(&mutpaths,)"));
        assert!(out.contains("tuono_lib::axum::Json(paths)"));
        // The original function is preserved.
        assert!(out.contains("asyncfnstatic_paths(paths:&mutStaticPaths)"));
    }

    #[test]
    fn a_parameterless_enumerator_has_no_state_or_request_extractor() {
        let out = expand(quote! {
            async fn static_paths(paths: &mut StaticPaths) {}
        });
        assert!(!out.contains("State(state)"));
        assert!(!out.contains("usecrate::tuono_main_state::ApplicationState"));
        assert!(!out.contains("Logger::new"));
        assert!(!out.contains("request:tuono_lib::axum::extract::Request"));
    }

    #[test]
    fn a_stateful_enumerator_extracts_and_forwards_application_state() {
        let out = expand(quote! {
            async fn static_paths(paths: &mut StaticPaths, db: Db, users: Users) {}
        });
        assert!(out.contains("tuono_lib::axum::extract::State(state)"));
        assert!(out.contains("usecrate::tuono_main_state::ApplicationState"));
        assert!(out.contains("ApplicationState{db,users,..}"));
        assert!(out.contains("static_paths(&mutpaths,db,users)"));
        // No request extractor when no logger is used.
        assert!(!out.contains("request:tuono_lib::axum::extract::Request"));
    }

    #[test]
    fn a_logger_is_bound_against_a_synthesised_request() {
        let out = expand(quote! {
            async fn static_paths(paths: &mut StaticPaths, logger: Logger) {}
        });
        // A logger pulls in the request extractor and a synthesised `Request`…
        assert!(out.contains("request:tuono_lib::axum::extract::Request"));
        assert!(out.contains("letreq=tuono_lib::Request::new"));
        assert!(out.contains("letlogger=tuono_lib::Logger::new(&req)"));
        // …but not the application state.
        assert!(!out.contains("State(state)"));
        assert!(out.contains("static_paths(&mutpaths,logger)"));
    }

    #[test]
    fn invalid_input_becomes_a_compile_error() {
        let out = expand(quote! { struct NotAFunction; });
        assert!(out.contains("compile_error!"));
    }
}
