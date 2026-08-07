use tower_http::cors::{Any, CorsLayer};
use ossido_lib::axum::http::Method;
use ossido_lib::middleware;

#[middleware]
pub fn api_cors_layer() -> CorsLayer {
    CorsLayer::new()
        // allow `GET` and `POST` when accessing the resource
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::PATCH])
        // allow requests from any origin
        .allow_origin(Any)
}
