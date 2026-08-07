// File automatically generated
// Do not manually change it

use tuono_lib::{Mode, Server, axum::Router, tokio, tuono_internal_init_v8_platform};
use tuono_lib::axum::routing::get;
const MODE: Mode = Mode::Dev;
#[path = "../src/routes/pokemons/GOAT/page.rs"]
mod pokemons_goat_page;
#[path = "../src/routes/pokemons/[pokemon]/page.rs"]
mod pokemons_dyn_pokemon_page;
#[path = "../src/routes/page.rs"]
mod page;
#[path = "../src/app.rs"]
mod tuono_main_state;
#[tokio::main]
async fn main() {
    tuono_internal_init_v8_platform();
    let user_custom_state = tuono_main_state::main();
    let router = Router::new()
        .merge(
            Router::new()
                .merge(
                    Router::new()
                        .merge(
                            Router::new()
                                .route(
                                    "/pokemons/GOAT",
                                    get(pokemons_goat_page::tuono_internal_route),
                                )
                                .route(
                                    "/__tuono/data/pokemons/GOAT",
                                    get(pokemons_goat_page::tuono_internal_api),
                                ),
                        )
                        .merge(
                            Router::new()
                                .route(
                                    "/pokemons/{pokemon}",
                                    get(pokemons_dyn_pokemon_page::tuono_internal_route),
                                )
                                .route(
                                    "/__tuono/data/pokemons/{pokemon}",
                                    get(pokemons_dyn_pokemon_page::tuono_internal_api),
                                ),
                        ),
                )
                .route("/", get(page::tuono_internal_route))
                .route("/__tuono/data/", get(page::tuono_internal_api)),
        )
        .with_state(user_custom_state);
    Server::init(router, MODE).await.start().await
}
