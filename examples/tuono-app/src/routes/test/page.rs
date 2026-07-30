use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tuono_lib::{handler, Props, Request, Response};

#[derive(Serialize, Deserialize, Debug)]
struct TestPageProps {
    timestamp: u128,
}

#[handler]
async fn test_props(_req: Request) -> Response {
    tuono_lib::tokio::time::sleep(std::time::Duration::from_millis(3000)).await;
    let data = TestPageProps {
        timestamp: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis(),
    };

    Response::Props(Props::new(data))
}
