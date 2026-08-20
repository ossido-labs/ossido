//! ## Ossido
//! Ossido is a full-stack web framework for building React applications using Rust as the backend with a strong focus on usability and performance.
//!
//! You can find the full documentation at [ossido.dev](https://ossido.dev/)

extern crate proc_macro;
use proc_macro::TokenStream;

mod action;
mod api;
mod environment;
mod handler;
mod middleware;
mod props;
mod static_paths;
mod utils;

#[proc_macro_attribute]
pub fn handler(args: TokenStream, item: TokenStream) -> TokenStream {
    handler::handler_core(args.into(), item.into()).into()
}

/// `#[ossido::Props]` — bundle `serde::{Serialize, Deserialize}` and register the
/// struct for TypeScript generation (everything `#[Type]` does), plus a
/// `From<Self> for ossido::Response` impl so it can be returned directly from a
/// `#[ossido::handler]`. The struct must be `'static`.
#[proc_macro_attribute]
#[allow(non_snake_case)]
pub fn Props(args: TokenStream, item: TokenStream) -> TokenStream {
    props::props_attr(args.into(), item.into()).into()
}

#[proc_macro_attribute]
pub fn api(args: TokenStream, item: TokenStream) -> TokenStream {
    api::api_core(args.into(), item.into()).into()
}

/// `#[ossido::action]` — a Next.js-style server action. Marks a function whose
/// typed TypeScript counterpart the build generates (importable, passable to
/// `<form action={fn}>`, and usable with `useActionState`). The first
/// non-state, non-`logger`, non-`PrevState` argument is the input (decoded from
/// the request body); a `PrevState<T>` argument opts into the
/// `useActionState` `(prevState, formData)` contract.
#[proc_macro_attribute]
pub fn action(args: TokenStream, item: TokenStream) -> TokenStream {
    action::action_core(args.into(), item.into()).into()
}

#[proc_macro_attribute]
pub fn middleware(args: TokenStream, item: TokenStream) -> TokenStream {
    middleware::middleware_core(args.into(), item.into()).into()
}

/// Mark the function in a dynamic route's `page.rs` that enumerates the pages to
/// statically generate for that route (Ossido's `getStaticPaths`). See
/// [`ossido::StaticPaths`](../ossido/struct.StaticPaths.html).
#[proc_macro_attribute]
pub fn static_paths(args: TokenStream, item: TokenStream) -> TokenStream {
    static_paths::static_paths_core(args.into(), item.into()).into()
}

/// `#[ossido::Type]` — bundle `serde::{Serialize, Deserialize}` onto a struct or
/// enum and generate its TypeScript type (exported from the `"@ossido-labs/ossido/types"`
/// module). Replaces the old `#[derive(Serialize, Deserialize, Type)]`.
#[proc_macro_attribute]
#[allow(non_snake_case)]
pub fn Type(args: TokenStream, item: TokenStream) -> TokenStream {
    props::type_attr(args.into(), item.into()).into()
}

/// `#[ossido::Environment]` — mark the project's typed environment schema. See
/// [`environment::environment_attr`] for the full contract (typed `FromStr`
/// parsing, required vs `Option` fields, the `#[public]` helper, and the
/// generated `from_env` / public-JSON methods). Read fields in Rust via
/// [`ossido::get_env!`](../ossido/macro.get_env.html); TypeScript types for the
/// public fields are generated only when this struct exists.
#[proc_macro_attribute]
#[allow(non_snake_case)]
pub fn Environment(args: TokenStream, item: TokenStream) -> TokenStream {
    environment::environment_attr(args.into(), item.into()).into()
}
