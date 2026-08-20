// File automatically generated
// Do not manually change it

use ossido::{Mode, Server, axum::Router, tokio, ossido_internal_init_v8_platform};
// AXUM_GET_ROUTE_HANDLER

/*MODE*/

// MODULE_IMPORTS

//MAIN_FILE_IMPORT//

// ENV_MODULE

#[tokio::main]
async fn main() {
    ossido_internal_init_v8_platform();

    // Load `.env` (honoring the config `env` override) and parse/register the
    // environment BEFORE the app-state initializer runs, so `app.rs` can build
    // `ApplicationState` utilities from `get_env!` / `std::env`.
    // BOOTSTRAP

    //MAIN_FILE_DEFINITION//

    // ROUTE_BUILDER
    //MAIN_FILE_USAGE//

    Server::init(router, MODE).await.start().await
}
