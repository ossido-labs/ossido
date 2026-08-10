//! ## Ossido
//! Ossido is a full-stack web framework for building React applications using Rust as the backend with a strong focus on usability and performance.
//!
//! You can find the full documentation at [ossido.dev](https://ossido.dev/)

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
pub use axum;
pub use axum_extra::extract::cookie;
pub use error_handler::{ErrorContext, set_error_handler};
pub use logger::Logger;
pub use mode::Mode;
// `Props` is re-exported both as the struct (from `response`) and as the
// attribute macro — the same name in two namespaces, like `serde::Serialize`.
pub use ossido_macros::{Props, Type, api, handler, middleware, static_paths};
pub use ossido_ssr::Ssr;
pub use payload::Payload;
pub use request::Request;
pub use response::{
    HandlerData, Props, RenderJob, Response, chain_json, error_json, error_render_job,
    finish_render, render_chain, render_error_to_string, resolve_handler, respond_to_api_error,
};
// Re-exported so the `#[Type]` / `#[Props]` attribute macros can inject
// `#[derive(ossido::serde::Serialize, ossido::serde::Deserialize)]` without user
// code needing a direct `serde` dependency of its own.
pub use serde;
pub use server::{Server, ossido_internal_init_v8_platform};
pub use server_error::{ErrorSource, ServerError, catch_handler};
pub use static_paths::{SegmentValue, StaticParams, StaticPaths};
pub use tokio;
// `tower` is re-exported (like `axum`) because middleware is a standard part of
// Ossido — a `#[middleware]` returns a `tower::Layer`. `tower_http` is left out
// on purpose: it's an opt-in dependency users add themselves when needed.
pub use tower;
