use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tuono_lib::{Props, Request, Response};

#[derive(Serialize, Deserialize, Debug)]
struct TestPageProps {
    timestamp: u128,
}

#[tuono_lib::handler]
async fn test_props(_req: Request) -> Response {
    let data = TestPageProps {
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis(),
    };

    Response::Props(Props::new(data))
}
