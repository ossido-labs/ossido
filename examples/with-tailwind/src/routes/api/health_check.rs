use ossido::{api, Request};
use ossido::axum::http::StatusCode;

#[api(GET)]
pub async fn health_check(_req: Request) -> StatusCode {
    StatusCode::OK
}
