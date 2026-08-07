// File automatically generated
// Do not manually change it

use tuono_lib::{Mode, Server, axum::Router, tokio, tuono_internal_init_v8_platform};
const MODE: Mode = Mode::Dev;
mod tuono_main_state {
    #[allow(dead_code)]
    pub type ApplicationState = ();
}
#[tokio::main]
async fn main() {
    tuono_internal_init_v8_platform();
    let router = Router::new().merge(Router::new());
    Server::init(router, MODE).await.start().await
}
