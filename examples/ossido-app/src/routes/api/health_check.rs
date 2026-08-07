use ossido_lib::{api, Request};
use ossido_lib::axum::http::StatusCode;

#[api(GET)]
pub async fn health_check(_req: Request) -> StatusCode {
    StatusCode::OK
}
