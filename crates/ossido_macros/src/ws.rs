use proc_macro2::TokenStream;
use quote::quote;
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{FnArg, ItemFn, Pat, Type};

use crate::utils::{
    crate_application_state_extractor, create_struct_fn_arg, import_main_application_state,
    is_logger_pat,
};

/// The last path segment of a type, e.g. `ossido::ws::WebSocket` → `"WebSocket"`.
fn type_last_ident(ty: &Type) -> Option<String> {
    if let Type::Path(type_path) = ty {
        return type_path
            .path
            .segments
            .last()
            .map(|segment| segment.ident.to_string());
    }
    None
}

/// `#[ossido::ws]` — the project's single WebSocket handler (must live in
/// `src/ws.rs`). Generates the axum upgrade handler `ossido_internal_ws`.
///
/// The user's function takes `Request` first, then any of: the socket
/// (`WebSocket` or `TypedSocket`), the `SocketManager`, a `logger`, and
/// `ApplicationState` fields — in any order. The macro supplies the framework
/// ones and destructures the rest from state, mirroring `#[api]`.
pub fn ws_core(_attrs: TokenStream, item: TokenStream) -> TokenStream {
    let item = match syn::parse2::<ItemFn>(item) {
        Ok(item) => item,
        Err(err) => return err.to_compile_error(),
    };
    let fn_name = &item.sig.ident;

    // The call arguments to the user fn (after `req`), in declared order.
    let mut call_args: Vec<TokenStream> = Vec::new();
    // The subset destructured from `ApplicationState`.
    let mut state_field_names: Punctuated<Pat, Comma> = Punctuated::new();
    // Any `logger` parameters, provided by the framework.
    let mut logger_pats: Vec<Pat> = Vec::new();

    for (index, arg) in item.sig.inputs.iter().enumerate() {
        if index == 0 {
            continue; // the request
        }
        if let FnArg::Typed(pat_type) = arg {
            let pat = (*pat_type.pat).clone();
            match type_last_ident(&pat_type.ty).as_deref() {
                Some("WebSocket") => call_args.push(quote! { __ossido_ws_raw }),
                Some("TypedSocket") => {
                    call_args.push(quote! { ossido::ws::TypedSocket::new(__ossido_ws_raw) })
                }
                Some("SocketManager") => call_args.push(quote! { ossido::ws::sockets() }),
                _ if is_logger_pat(&pat) => {
                    logger_pats.push(pat.clone());
                    call_args.push(quote! { #pat });
                }
                _ => {
                    state_field_names.push(pat.clone());
                    call_args.push(quote! { #pat });
                }
            }
        }
    }

    let mut axum_arguments: Punctuated<FnArg, Comma> = Punctuated::new();
    if !state_field_names.is_empty() {
        axum_arguments.push(create_struct_fn_arg());
    }
    axum_arguments.push(syn::parse_quote!(ws: ossido::axum::extract::ws::WebSocketUpgrade));
    axum_arguments.push(syn::parse_quote!(uri: ossido::axum::http::Uri));
    axum_arguments.push(syn::parse_quote!(headers: ossido::axum::http::HeaderMap));

    let application_state_extractor = crate_application_state_extractor(state_field_names.clone());
    let application_state_import = import_main_application_state(state_field_names);

    let logger_bindings = quote! {
        #( let #logger_pats = ossido::Logger::new(&req); )*
    };

    quote! {
        #application_state_import

        #item

        pub async fn ossido_internal_ws(#axum_arguments) -> impl ossido::axum::response::IntoResponse {
            #application_state_extractor

            let req = ossido::Request::new(uri, headers, ::std::collections::HashMap::new(), None);
            #logger_bindings

            ws.on_upgrade(move |__ossido_ws_raw| async move {
                let _ = #fn_name(req, #(#call_args),*).await;
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn expand(item: TokenStream) -> String {
        ws_core(TokenStream::new(), item).to_string().replace(' ', "")
    }

    #[test]
    fn generates_the_upgrade_handler_and_keeps_the_user_fn() {
        let out = expand(quote! {
            async fn socket(req: Request, socket: WebSocket) {}
        });
        assert!(out.contains("pubasyncfnossido_internal_ws"));
        assert!(out.contains("WebSocketUpgrade"));
        assert!(out.contains("ws.on_upgrade"));
        // The socket arg receives the raw upgraded socket.
        assert!(out.contains("socket(req,__ossido_ws_raw)"));
        // No state extractor when only framework args are used.
        assert!(!out.contains("State(state)"));
    }

    #[test]
    fn injects_manager_and_binds_logger_and_state() {
        let out = expand(quote! {
            async fn socket(req: Request, socket: WebSocket, sockets: SocketManager, db: Db, logger: Logger) {}
        });
        assert!(out.contains("State(state)"));
        assert!(out.contains("usecrate::ossido_main_state::ApplicationState"));
        assert!(out.contains("letApplicationState{db,..}=state;"));
        assert!(out.contains("letlogger=ossido::Logger::new(&req)"));
        // Declared order is preserved in the call.
        assert!(out.contains("socket(req,__ossido_ws_raw,ossido::ws::sockets(),db,logger)"));
    }

    #[test]
    fn wraps_a_typed_socket_argument() {
        let out = expand(quote! {
            async fn socket(req: Request, socket: TypedSocket) {}
        });
        assert!(out.contains("ossido::ws::TypedSocket::new(__ossido_ws_raw)"));
    }

    #[test]
    fn invalid_input_becomes_a_compile_error() {
        let out = expand(quote! { 1 + 1 });
        assert!(out.contains("compile_error!"));
    }
}
