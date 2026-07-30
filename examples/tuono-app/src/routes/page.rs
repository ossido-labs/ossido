use serde::Serialize;
use tuono_lib::{handler, Logger, Props, Request, Type};

#[derive(Serialize, Type, Props)]
struct MyResponse {
    subtitle: String,
}

#[handler]
async fn get_server_side_props(_req: Request, logger: Logger) -> MyResponse {
    logger.info("Serving the index page");
    MyResponse {
        subtitle: "The react / rust fullstack framework".into(),
    }
}
