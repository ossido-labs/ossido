use ossido::{Props, Request, Response};

#[ossido::handler]
async fn route(_: Request) -> Response {
    Response::Props(Props::new("{}"))
}
