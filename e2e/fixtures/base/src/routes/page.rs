use ossido::{handler, Props, Request, Response, Type};

#[Type]
struct MyResponse {
    subtitle: String,
}

#[handler]
async fn get_server_side_props(_req: Request) -> Response {
    Response::Props(Props::new(MyResponse {
        subtitle: "Subtitle received from the server".to_string(),
    }))
}
