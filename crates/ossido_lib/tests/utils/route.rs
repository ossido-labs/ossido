use ossido_lib::{Props, Request, Response};

#[ossido_lib::handler]
async fn route(_: Request) -> Response {
    Response::Props(Props::new("{}"))
}
