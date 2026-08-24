//! API-scoped middleware: applies to routes under `/api` only.

use ossido::axum::http::Method;
use ossido::middleware;
use tower_http::cors::{Any, CorsLayer};

#[middleware]
pub fn api_cors_layer() -> CorsLayer {
    CorsLayer::new()
        .allow_methods([Method::GET])
        .allow_origin(Any)
}
