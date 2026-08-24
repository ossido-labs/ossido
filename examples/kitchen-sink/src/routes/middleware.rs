//! Site-wide middleware: any `#[middleware]` function returning a
//! `tower::Layer` is applied to every route under this directory.

use ossido::axum::http::HeaderValue;
use ossido::axum::http::header::HeaderName;
use ossido::middleware;
use tower_http::set_header::SetResponseHeaderLayer;

/// Stamp every response with an `x-powered-by` header.
#[middleware]
pub fn powered_by_layer() -> SetResponseHeaderLayer<HeaderValue> {
    SetResponseHeaderLayer::if_not_present(
        HeaderName::from_static("x-powered-by"),
        HeaderValue::from_static("ossido"),
    )
}
