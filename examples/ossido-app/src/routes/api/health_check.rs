use ossido::axum::http::StatusCode;
use ossido::{Request, api};

#[api(GET)]
pub async fn health_check(_req: Request) -> StatusCode {
    StatusCode::OK
}
