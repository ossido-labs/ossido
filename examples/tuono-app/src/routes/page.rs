use serde::Serialize;
use tuono_lib::{Props, Request, Type};

#[derive(Serialize, Type, Props)]
struct MyResponse {
    subtitle: String,
}

#[tuono_lib::handler]
async fn get_server_side_props(_req: Request) -> MyResponse {
    MyResponse {
        subtitle: "The react / rust fullstack framework".into(),
    }
}
