use serde::Serialize;
use ossido_lib::{handler, Props, Request, Response, Type};

#[derive(Serialize, Type)]
struct MyResponse<'a> {
    subtitle: &'a str,
}

#[handler]
async fn get_server_side_props(_req: Request) -> Response {
    Response::Props(Props::new(MyResponse {
        subtitle: "Subtitle received from the server",
    }))
}
