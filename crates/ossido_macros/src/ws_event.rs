use proc_macro2::TokenStream;
use quote::quote;
use syn::{DeriveInput, Ident, LitStr};

/// Which direction a WebSocket event flows, named from the sender's role.
pub enum Direction {
    /// server → client (the server sends, the client receives).
    Server,
    /// client → server (the client sends, the server receives).
    Client,
}

/// Parse the event name from the attribute args: a string literal
/// (`"chat_message"`) or a bare ident (`chat_message`).
fn parse_event_name(args: TokenStream) -> syn::Result<LitStr> {
    if let Ok(lit) = syn::parse2::<LitStr>(args.clone()) {
        return Ok(lit);
    }
    let ident = syn::parse2::<Ident>(args)?;
    Ok(LitStr::new(&ident.to_string(), ident.span()))
}

/// Shared implementation of `#[ossido::server_ws_event(..)]` /
/// `#[ossido::client_ws_event(..)]`.
///
/// Applies everything `#[ossido::Type]` does (serde derives + TypeScript
/// generation), then implements `WsEvent` (name) and the matching direction
/// marker trait (`ServerWsEvent` / `ClientWsEvent`).
pub fn ws_event_core(direction: Direction, args: TokenStream, item: TokenStream) -> TokenStream {
    let name = match parse_event_name(args) {
        Ok(name) => name,
        Err(err) => return err.to_compile_error(),
    };

    let input = match syn::parse2::<DeriveInput>(item.clone()) {
        Ok(input) => input,
        Err(err) => return err.to_compile_error(),
    };
    let ident = &input.ident;
    let (impl_generics, ty_generics, where_clause) = input.generics.split_for_impl();

    // `#[Type]` re-emits the struct/enum with serde derives and registers it for
    // TypeScript generation (source-scanned by ossido_cli).
    let typed = crate::props::type_attr(TokenStream::new(), item);

    let direction_impl = match direction {
        Direction::Server => quote! {
            impl #impl_generics ossido::ws::ServerWsEvent for #ident #ty_generics #where_clause {}
        },
        Direction::Client => quote! {
            impl #impl_generics ossido::ws::ClientWsEvent for #ident #ty_generics #where_clause {}
        },
    };

    quote! {
        #typed

        impl #impl_generics ossido::ws::WsEvent for #ident #ty_generics #where_clause {
            const EVENT: &'static str = #name;
        }

        #direction_impl
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn expand(direction: Direction, args: TokenStream, item: TokenStream) -> String {
        ws_event_core(direction, args, item)
            .to_string()
            .replace(' ', "")
    }

    #[test]
    fn server_event_applies_type_and_direction_trait() {
        let out = expand(
            Direction::Server,
            quote! { "user_joined" },
            quote! { struct UserJoined { user_id: u64 } },
        );
        // Serde derives from #[Type].
        assert!(out.contains("ossido::serde::Serialize"));
        assert!(out.contains("ossido::serde::Deserialize"));
        // The event name + direction trait.
        assert!(out.contains("constEVENT:&'staticstr=\"user_joined\""));
        assert!(out.contains("ossido::ws::ServerWsEventforUserJoined"));
        assert!(out.contains("ossido::ws::WsEventforUserJoined"));
    }

    #[test]
    fn client_event_uses_the_client_trait_and_accepts_a_bare_ident_name() {
        let out = expand(
            Direction::Client,
            quote! { chat_message },
            quote! { struct ChatMessage { text: String } },
        );
        assert!(out.contains("constEVENT:&'staticstr=\"chat_message\""));
        assert!(out.contains("ossido::ws::ClientWsEventforChatMessage"));
        assert!(!out.contains("ServerWsEvent"));
    }

    #[test]
    fn invalid_input_becomes_a_compile_error() {
        let out = expand(Direction::Server, quote! { "x" }, quote! { 1 + 1 });
        assert!(out.contains("compile_error!"));
    }
}
