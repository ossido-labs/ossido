use ossido::Request;
use ossido::axum::http::StatusCode;

#[ossido::api(GET)]
async fn health_check(_req: Request) -> StatusCode {
    StatusCode::OK
}
