use serde::Serialize;
use tuono_lib::{Props, Request, Type};

#[derive(Serialize, Type, Props)]
struct AboutProps {
    heading: String,
}

#[tuono_lib::handler]
async fn about(_req: Request) -> AboutProps {
    AboutProps {
        heading: "About us".into(),
    }
}
