use tuono_lib::{api, Request};
use tuono_lib::axum::http::StatusCode;

#[api(GET)]
pub async fn health_check(_req: Request) -> StatusCode {
    StatusCode::OK
}
