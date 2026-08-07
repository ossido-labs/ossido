use proc_macro2::TokenStream;
use quote::quote;
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{FnArg, ItemFn, Pat};

use crate::utils::{
    crate_application_state_extractor, create_struct_fn_arg, import_main_application_state,
    is_logger_pat, params_argument, request_argument,
};

pub fn handler_core(_args: TokenStream, item: TokenStream) -> TokenStream {
    let item = match syn::parse2::<ItemFn>(item) {
        Ok(item) => item,
        Err(err) => return err.to_compile_error(),
    };

    let fn_name = &item.sig.ident;

    // All arguments after the request, passed to the handler in declared order.
    let mut argument_names: Punctuated<Pat, Comma> = Punctuated::new();
    // The subset destructured from `ApplicationState` (i.e. not the `logger`).
    let mut state_field_names: Punctuated<Pat, Comma> = Punctuated::new();
    // Any `logger` parameters, provided automatically by the framework.
    let mut logger_pats: Vec<Pat> = Vec::new();

    // The first argument is always the request. Every other argument is either
    // an application-state field (destructured from `ApplicationState` by name)
    // or a `logger` (provided by the framework — no `ApplicationState` needed).
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

    // axum extractors: params (Path), the application state (only when a state
    // field is actually used), and the request (last — it consumes the body).
    let mut axum_arguments: Punctuated<FnArg, Comma> = Punctuated::new();
    axum_arguments.push(params_argument());
    if !state_field_names.is_empty() {
        axum_arguments.push(create_struct_fn_arg());
    }
    axum_arguments.push(request_argument());

    let application_state_extractor = crate_application_state_extractor(state_field_names.clone());
    let application_state_import = import_main_application_state(state_field_names.clone());

    // Binds each declared `logger` parameter to a request-scoped framework
    // logger. Must be emitted where `req` is in scope.
    let logger_bindings = quote! {
        #( let #logger_pats = ossido_lib::Logger::new(&req); )*
    };

    // Destructures the application state for the data-only `ossido_internal_props`
    // entry point (see below). `ApplicationState` is referenced by full path so
    // no import is needed, and it is only destructured when the handler actually
    // uses state.
    let props_state_binding = if state_field_names.is_empty() {
        quote! {}
    } else {
        quote! {
            let crate::ossido_main_state::ApplicationState { #state_field_names, .. } = _state;
        }
    };

    quote! {
        #application_state_import

        #item

        // Data-only entry point used to compose a whole layout + page chain for a
        // single request: it takes a ready `Request` and the application state by
        // value (a composite extracts state once and clones it to every handler)
        // and returns the raw `Response` instead of rendering it. `ApplicationState`
        // is always defined in the generated `main.rs` (aliased to `()` when the
        // app has no custom state), so this compiles for every handler.
        #[allow(dead_code)]
        pub async fn ossido_internal_props(
            req: ossido_lib::Request,
            _state: crate::ossido_main_state::ApplicationState,
        ) -> ossido_lib::HandlerData {
            #props_state_binding
            #logger_bindings
            let result = ossido_lib::catch_handler(#fn_name(req, #argument_names))
                .await
                .map(ossido_lib::Response::from);
            ossido_lib::resolve_handler(result)
        }

        pub async fn ossido_internal_route(
            #axum_arguments
        ) -> impl ossido_lib::axum::response::IntoResponse {
            use ossido_lib::axum::response::IntoResponse as _;

            #application_state_extractor

           let pathname = request.uri();
           let headers = request.headers();

           let req = ossido_lib::Request::new(pathname.to_owned(), headers.to_owned(), params, None);
           #logger_bindings

           // Catch an unexpected panic so it surfaces in the dev error overlay
           // (dev) or as a detail-free 500 (prod) rather than dropping the request.
           // `Response::from` lets the handler return either a `Response` or any
           // type that derives `ossido_lib::Props`.
           // Turn the handler result into a `Send` render job *synchronously*
           // (the `Response` and the `Result` scrutinee both hold non-`Send`
           // props, so no await may span this match), then await the render.
           let render_job = match ossido_lib::catch_handler(#fn_name(req.clone(), #argument_names)).await {
               Ok(response) => ossido_lib::Response::from(response).into_render_job(req),
               Err(server_error) => ossido_lib::error_render_job(req, server_error),
           };
           ossido_lib::finish_render(render_job).await.into_response()
        }

        pub async fn ossido_internal_api(
            #axum_arguments
        ) -> impl ossido_lib::axum::response::IntoResponse {
            use ossido_lib::axum::response::IntoResponse as _;

            #application_state_extractor

           let pathname = request.uri();
           let headers = request.headers();

           let req = ossido_lib::Request::new(pathname.to_owned(), headers.to_owned(), params, None);
           #logger_bindings

           match ossido_lib::catch_handler(#fn_name(req.clone(), #argument_names)).await {
               Ok(response) => ossido_lib::Response::from(response).json().into_response(),
               Err(server_error) => ossido_lib::error_json(server_error),
           }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Generate the handler expansion and return it whitespace-free so token
    /// spacing (which `quote!` controls, not us) doesn't make assertions brittle.
    fn expand(item: TokenStream) -> String {
        handler_core(TokenStream::new(), item)
            .to_string()
            .replace(' ', "")
    }

    #[test]
    fn generates_the_three_entry_points() {
        let out = expand(quote! {
            async fn home(req: Request) -> Response { todo!() }
        });
        assert!(out.contains("asyncfnossido_internal_props"));
        assert!(out.contains("pubasyncfnossido_internal_route"));
        assert!(out.contains("pubasyncfnossido_internal_api"));
        // The original function is preserved in the output.
        assert!(out.contains("asyncfnhome(req:Request)"));
    }

    #[test]
    fn a_stateless_handler_has_no_state_extractor_or_import() {
        let out = expand(quote! {
            async fn home(req: Request) -> Response { todo!() }
        });
        // No `State(state)` extractor and no `ApplicationState` destructuring when
        // the handler declares no state fields.
        assert!(!out.contains("State(state)"));
        assert!(!out.contains("usecrate::ossido_main_state::ApplicationState"));
        assert!(!out.contains("Logger::new"));
    }

    #[test]
    fn a_stateful_handler_extracts_and_destructures_application_state() {
        let out = expand(quote! {
            async fn dashboard(req: Request, db: Db, user: User) -> Response { todo!() }
        });
        // The axum `State` extractor and the state import both appear…
        assert!(out.contains("ossido_lib::axum::extract::State(state)"));
        assert!(out.contains("usecrate::ossido_main_state::ApplicationState"));
        // …and every declared field is destructured and forwarded to the handler.
        assert!(out.contains("ApplicationState{db,user,..}"));
        assert!(out.contains("dashboard(req.clone(),db,user)"));
    }

    #[test]
    fn a_logger_parameter_is_bound_without_needing_state() {
        let out = expand(quote! {
            async fn home(req: Request, logger: Logger) -> Response { todo!() }
        });
        // The logger is provided by the framework, so it neither adds a `State`
        // extractor nor an `ApplicationState` import…
        assert!(!out.contains("State(state)"));
        assert!(!out.contains("usecrate::ossido_main_state::ApplicationState"));
        // …it is bound to a request-scoped logger and forwarded to the handler.
        assert!(out.contains("letlogger=ossido_lib::Logger::new(&req)"));
        assert!(out.contains("home(req.clone(),logger)"));
    }

    #[test]
    fn a_logger_alongside_state_binds_the_logger_but_omits_it_from_state() {
        let out = expand(quote! {
            async fn page(req: Request, db: Db, logger: Logger) -> Response { todo!() }
        });
        // `db` is destructured from state; `logger` is not part of `ApplicationState`.
        assert!(out.contains("ApplicationState{db,..}"));
        assert!(!out.contains("ApplicationState{db,logger,.."));
        assert!(out.contains("letlogger=ossido_lib::Logger::new(&req)"));
        // Both are passed to the handler in declared order.
        assert!(out.contains("page(req.clone(),db,logger)"));
    }

    #[test]
    fn invalid_input_becomes_a_compile_error_instead_of_panicking() {
        // Not a function item — `syn` rejects it, and we surface a `compile_error!`.
        let out = expand(quote! { struct NotAFunction; });
        assert!(out.contains("compile_error!"));
    }
}
