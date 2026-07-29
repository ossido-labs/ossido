use crate::utils::{
    crate_application_state_extractor, create_struct_fn_arg, import_main_application_state,
    params_argument, request_argument,
};

use proc_macro::TokenStream;
use quote::quote;
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{FnArg, ItemFn, Pat, parse_macro_input};

pub fn handler_core(_args: TokenStream, item: TokenStream) -> TokenStream {
    let item = parse_macro_input!(item as ItemFn);

    let fn_name = &item.sig.ident;

    let mut argument_names: Punctuated<Pat, Comma> = Punctuated::new();
    let mut axum_arguments: Punctuated<FnArg, Comma> = Punctuated::new();

    // Fn Arguments minus the first which always is the request
    for (i, arg) in item.sig.inputs.iter().enumerate() {
        if i == 0 {
            axum_arguments.insert(i, params_argument());
            continue;
        }

        if i == 1 {
            axum_arguments.insert(1, create_struct_fn_arg())
        }

        if let FnArg::Typed(pat_type) = arg {
            let index = i - 1;
            let argument_name = *pat_type.pat.clone();
            argument_names.insert(index, argument_name.clone());
        }
    }

    axum_arguments.insert(axum_arguments.len(), request_argument());

    let application_state_extractor = crate_application_state_extractor(argument_names.clone());
    let application_state_import = import_main_application_state(argument_names.clone());

    // Destructures the application state for the data-only `tuono_internal_props`
    // entry point (see below). `ApplicationState` is referenced by full path so
    // no import is needed, and it is only destructured when the handler actually
    // uses state.
    let props_state_binding = if argument_names.is_empty() {
        quote! {}
    } else {
        quote! {
            let crate::tuono_main_state::ApplicationState { #argument_names, .. } = _state;
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
        pub async fn tuono_internal_props(
            req: tuono_lib::Request,
            _state: crate::tuono_main_state::ApplicationState,
        ) -> tuono_lib::HandlerData {
            #props_state_binding
            let result = tuono_lib::catch_handler(#fn_name(req, #argument_names))
                .await
                .map(tuono_lib::Response::from);
            tuono_lib::resolve_handler(result)
        }

        pub async fn tuono_internal_route(
            #axum_arguments
        ) -> impl tuono_lib::axum::response::IntoResponse {
            use tuono_lib::axum::response::IntoResponse as _;

            #application_state_extractor

           let pathname = request.uri();
           let headers = request.headers();

           let req = tuono_lib::Request::new(pathname.to_owned(), headers.to_owned(), params, None);

           // Catch an unexpected panic so it surfaces in the dev error overlay
           // (dev) or as a detail-free 500 (prod) rather than dropping the request.
           // `Response::from` lets the handler return either a `Response` or any
           // type that derives `tuono_lib::Props`.
           match tuono_lib::catch_handler(#fn_name(req.clone(), #argument_names)).await {
               Ok(response) => tuono_lib::Response::from(response).render_to_string(req).into_response(),
               Err(server_error) => tuono_lib::render_error_to_string(req, server_error),
           }
        }

        pub async fn tuono_internal_api(
            #axum_arguments
        ) -> impl tuono_lib::axum::response::IntoResponse {
            use tuono_lib::axum::response::IntoResponse as _;

            #application_state_extractor

           let pathname = request.uri();
           let headers = request.headers();

           let req = tuono_lib::Request::new(pathname.to_owned(), headers.to_owned(), params, None);

           match tuono_lib::catch_handler(#fn_name(req.clone(), #argument_names)).await {
               Ok(response) => tuono_lib::Response::from(response).json().into_response(),
               Err(server_error) => tuono_lib::error_json(server_error),
           }
        }
    }
    .into()
}
