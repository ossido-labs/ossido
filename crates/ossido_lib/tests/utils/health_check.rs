use ossido_lib::Request;
use ossido_lib::axum::http::StatusCode;

#[ossido_lib::api(GET)]
async fn health_check(_req: Request) -> StatusCode {
    StatusCode::OK
}
