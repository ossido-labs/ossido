//! ## Ossido
//! Ossido is a full-stack web framework for building React applications using Rust as the backend with a strong focus on usability and performance.
//!
//! You can find the full documentation at [ossido.dev](https://ossido.dev/)

extern crate proc_macro;
use proc_macro::TokenStream;

mod api;
mod handler;
mod middleware;
mod props;
mod static_paths;
mod utils;

#[proc_macro_attribute]
pub fn handler(args: TokenStream, item: TokenStream) -> TokenStream {
    handler::handler_core(args.into(), item.into()).into()
}

/// Derive `From<Self> for ossido_lib::Response`, letting a struct be returned
/// directly from a `#[ossido_lib::handler]` (it becomes a `Props` response).
/// The struct must also be `serde::Serialize` and `'static`.
#[proc_macro_derive(Props)]
pub fn derive_props(item: TokenStream) -> TokenStream {
    props::derive_props_core(item.into()).into()
}

#[proc_macro_attribute]
pub fn api(args: TokenStream, item: TokenStream) -> TokenStream {
    api::api_core(args.into(), item.into()).into()
}

#[proc_macro_attribute]
pub fn middleware(args: TokenStream, item: TokenStream) -> TokenStream {
    middleware::middleware_core(args.into(), item.into()).into()
}

/// Mark the function in a dynamic route's `page.rs` that enumerates the pages to
/// statically generate for that route (Ossido's `getStaticPaths`). See
/// [`ossido_lib::StaticPaths`](../ossido_lib/struct.StaticPaths.html).
#[proc_macro_attribute]
pub fn static_paths(args: TokenStream, item: TokenStream) -> TokenStream {
    static_paths::static_paths_core(args.into(), item.into()).into()
}

/// Automatically generate typescript's types
/// from Rust's structs, types and enums.
///
/// The types will be exported on the client side
/// and it will be available from the `"ossido/types"` module.
#[proc_macro_derive(Type)]
pub fn derive_typescript_type(_: TokenStream) -> TokenStream {
    TokenStream::new()
}
