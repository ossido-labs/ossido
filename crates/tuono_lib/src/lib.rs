//! ## Tuono
//! Tuono is a full-stack web framework for building React applications using Rust as the backend with a strong focus on usability and performance.
//!
//! You can find the full documentation at [tuono.dev](https://tuono.dev/)

mod catch_all;
mod config;
mod env;
mod manifest;
mod mode;
mod payload;
mod request;
mod response;
mod server;
mod server_error;
mod services;
mod ssr;
mod vite_reverse_proxy;
mod vite_websocket_proxy;

pub use mode::Mode;
pub use payload::Payload;
pub use request::Request;
pub use response::{Props, Response, error_json, render_error_to_string};
pub use server::{Server, tuono_internal_init_v8_platform};
pub use server_error::{ErrorSource, ServerError, catch_handler};
pub use tuono_lib_macros::{Type, api, handler, middleware};

// Re-exports
pub use axum;
pub use axum_extra::extract::cookie;
pub use ssr_rs::Ssr;
pub use tokio;
