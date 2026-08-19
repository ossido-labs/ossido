//! ## Ossido
//! Ossido is a full-stack web framework for building React applications using Rust as the backend with a strong focus on usability and performance.
//!
//! You can find the full documentation at [ossido.dev](https://ossido.dev/)

/// Read a field from the project's `#[ossido::Environment]` struct, returning a
/// typed copy of its value.
///
/// ```ignore
/// let db = ossido::get_env!(database_url); // -> String
/// let port = ossido::get_env!(port);       // -> u16
/// ```
///
/// Resolves to the parsed environment singleton the generated `main.rs` builds
/// at `crate::__ossido_environment()`. If the project defines **no** `Environment`
/// struct that accessor is never generated, so `get_env!` fails to compile at the
/// call site — the Rust equivalent of the frontend `getEnv` throwing at runtime.
///
/// The `crate::` path (deliberately not `$crate::`) resolves against the crate
/// where the macro is *invoked* (the user's binary), where the generated
/// accessor lives — not against `ossido`.
#[macro_export]
macro_rules! get_env {
    ($field:ident) => {
        crate::__ossido_environment().$field.clone()
    };
}

pub mod action;
mod catch_all;
mod config;
pub mod debug;
mod env;
mod error_handler;
mod logger;
mod manifest;
mod mode;
mod payload;
mod render_pool;
mod request;
mod response;
mod server;
mod server_error;
mod services;
mod ssr;
mod static_paths;
mod vite_reverse_proxy;
mod vite_websocket_proxy;

// Re-exports
pub use action::{ActionError, ActionInputError, Files, PrevState, UploadedFile};
pub use axum;
pub use axum_extra::extract::cookie;
pub use error_handler::{ErrorContext, set_error_handler};
pub use logger::Logger;
pub use mode::Mode;
// `Props` is re-exported both as the struct (from `response`) and as the
// attribute macro — the same name in two namespaces, like `serde::Serialize`.
pub use ossido_macros::{Environment, Props, Type, action, api, handler, middleware, static_paths};
// `bootstrap` loads `.env` and registers the project's public env at the top of
// the generated `main.rs` — before app-state init, so app state can read env.
// `public_env_json` is read by the SSR payload (`payload.rs`).
pub use env::{bootstrap, public_env_json, register_public_env};
pub use ossido_ssr::Ssr;
pub use payload::Payload;
pub use request::{BodyParseError, Request};
pub use response::{
    HandlerData, Props, RenderJob, Response, chain_json, error_json, error_render_job,
    finish_render, render_chain, render_error_to_string, resolve_handler, respond_to_api_error,
};
// Re-exported so the `#[Type]` / `#[Props]` attribute macros can inject
// `#[derive(ossido::serde::Serialize, ossido::serde::Deserialize)]` without user
// code needing a direct `serde` dependency of its own.
pub use serde;
// Re-exported so the `#[ossido::Environment]` macro can build the public-env JSON
// (`ossido::serde_json::Map`/`Value`) without user code depending on `serde_json`.
pub use serde_json;
pub use server::{Server, ossido_internal_init_v8_platform};
pub use server_error::{ErrorSource, ServerError, catch_handler};
pub use static_paths::{SegmentValue, StaticParams, StaticPaths};
pub use tokio;
// `tower` is re-exported (like `axum`) because middleware is a standard part of
// Ossido — a `#[middleware]` returns a `tower::Layer`. `tower_http` is left out
// on purpose: it's an opt-in dependency users add themselves when needed.
pub use tower;
