use serde::Serialize;
use tuono_lib::{handler, Props, Request, Type};

#[derive(Serialize, Type, Props)]
struct AboutProps {
    heading: String,
}

#[handler]
async fn about(_req: Request) -> AboutProps {
    AboutProps {
        heading: "About us".into(),
    }
}
