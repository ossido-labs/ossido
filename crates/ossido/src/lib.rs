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
/// With a second argument, an **`Option<T>` field is collapsed to a concrete
/// `T`**, using the fallback when the variable is unset (`None`):
///
/// ```ignore
/// // field: `analytics_enabled: Option<bool>`
/// let analytics = ossido::get_env!(analytics_enabled, false); // -> bool
/// ```
///
/// The fallback form only applies to `Option<T>` fields (a required field is
/// always present, so a fallback is meaningless — passing one is a type error).
///
/// Resolves to the parsed environment singleton the generated `main.rs` builds
/// at `crate::__ossido_environment()`. If the project defines **no** `Environment`
/// struct that accessor is never generated, so `get_env!` fails to compile at the
/// call site — the Rust equivalent of the frontend `getEnv` throwing at runtime.
///
/// The `crate::` path (deliberately not `$crate::`) resolves against the crate
/// where the macro is *invoked* (the user's binary), where the generated
/// accessor lives — not against `ossido`.
// `clippy::crate_in_macro_def` flags `crate::` in a macro as "usually not what
// you want" — but here it is exactly the intent: `__ossido_environment()` is
// generated at the *caller's* crate root, so `crate::` (call site) is correct
// and `$crate::` (this crate, `ossido`) would be wrong. The `__env_or` helper
// does use `$crate::` because it genuinely lives in `ossido`.
#[allow(clippy::crate_in_macro_def)]
#[macro_export]
macro_rules! get_env {
    ($field:ident) => {
        crate::__ossido_environment().$field.clone()
    };
    ($field:ident, $fallback:expr) => {
        $crate::__env_or(crate::__ossido_environment().$field.clone(), $fallback)
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
#[cfg(feature = "telemetry")]
mod otel;
#[cfg(not(feature = "telemetry"))]
#[path = "otel/stub.rs"]
mod otel;
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
mod ws_impl;

// Re-exports
pub use action::{ActionError, ActionInputError, Files, PrevState, UploadedFile};
pub use axum;
pub use axum_extra::extract::cookie;
// `bootstrap` loads `.env` and registers the project's public env at the top of
// the generated `main.rs` — before app-state init, so app state can read env.
// `public_env_json` is read by the SSR payload (`payload.rs`). `__env_or` backs
// the two-argument `get_env!` fallback form.
pub use env::{__env_or, bootstrap, public_env_json, register_public_env};
pub use error_handler::{ErrorContext, set_error_handler};
pub use logger::Logger;
pub use mode::Mode;
// `Props` is re-exported both as the struct (from `response`) and as the
// attribute macro — the same name in two namespaces, like `serde::Serialize`.
pub use ossido_macros::{
    Environment, Props, Type, action, api, client_ws_event, handler, middleware, server_ws_event,
    static_paths, ws,
};
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
// User-land instrumentation API: `#[ossido::tracing::instrument]`,
// `ossido::tracing::info_span!`, `ossido::tracing::info!` … Spans and events
// export via OpenTelemetry when the `OTEL_*` environment opts in; without it
// (or without the `telemetry` feature) every call is a near-free no-op.
pub use tracing;

/// Internal support for the code generated by ossido's attribute macros.
/// Not part of the public API.
#[doc(hidden)]
pub mod __otel {
    use tracing::instrument::{Instrument, Instrumented};

    /// Wraps a handler's future in its per-handler span (a child of the
    /// request's server span). Called by the `#[handler]`/`#[api]`/`#[action]`
    /// macro expansions; uses only the `tracing` fast path, so it costs one
    /// atomic load when telemetry is off.
    pub fn instrument_handler<F: std::future::Future>(
        name: &'static str,
        fut: F,
    ) -> Instrumented<F> {
        let span = tracing::info_span!(
            "handler",
            { "otel.name" } = name,
            { "code.function.name" } = name,
        );
        fut.instrument(span)
    }

    /// Drain the OTLP batch queues. Exists so integration tests can assert on
    /// exports deterministically; not for application use.
    pub fn force_flush() {
        crate::otel::force_flush();
    }
}

/// WebSocket support: the axum WS types plus Ossido's typed-event protocol and
/// keyed connection store. Used by the `#[ossido::ws]` handler and the
/// `#[ossido::server_ws_event]` / `#[ossido::client_ws_event]` event macros.
pub mod ws {
    pub use axum::extract::ws::{CloseFrame, Message, Utf8Bytes, WebSocket, WebSocketUpgrade};

    pub use crate::ws_impl::{
        ClientWsEvent, ConnId, Connection, Incoming, Key, ServerWsEvent, SocketGroup, SocketHandle,
        SocketManager, TypedSink, TypedSocket, TypedStream, WsError, WsEvent, decode, encode,
        sockets,
    };
}
