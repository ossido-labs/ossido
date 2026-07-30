use serde::Serialize;
use tuono_lib::{handler, Props, Request, Type};

#[derive(Serialize, Type, Props)]
struct MarketingLayoutProps {
    banner: String,
}

#[handler]
async fn marketing_layout(_req: Request) -> MarketingLayoutProps {
    MarketingLayoutProps {
        banner: "Marketing banner from a Rust layout handler".into(),
    }
}
