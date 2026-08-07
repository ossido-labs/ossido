// File automatically generated
// Do not manually change it

use tuono_lib::{Mode, Server, axum::Router, tokio, tuono_internal_init_v8_platform};
use tuono_lib::axum::routing::get;
const MODE: Mode = Mode::Dev;
#[path = "../src/routes/rust-error/page.rs"]
mod rust_hyphen_error_page;
#[path = "../src/routes/docs/[...slug]/page.rs"]
mod docs_dyn_catch_all_slug_page;
#[path = "../src/routes/pokemons/[pokemon]/page.rs"]
mod pokemons_dyn_pokemon_page;
#[path = "../src/routes/page.rs"]
mod page;
#[path = "../src/routes/middleware.rs"]
mod middleware;
mod tuono_main_state {
    #[allow(dead_code)]
    pub type ApplicationState = ();
}
#[tokio::main]
async fn main() {
    tuono_internal_init_v8_platform();
    let router = Router::new()
        .merge(
            Router::new()
                .merge(
                    Router::new()
                        .route(
                            "/rust-error",
                            get(rust_hyphen_error_page::tuono_internal_route),
                        )
                        .route(
                            "/__tuono/data/rust-error",
                            get(rust_hyphen_error_page::tuono_internal_api),
                        ),
                )
                .merge(Router::new())
                .merge(
                    Router::new()
                        .merge(
                            Router::new()
                                .route(
                                    "/docs/{*slug}",
                                    get(docs_dyn_catch_all_slug_page::tuono_internal_route),
                                )
                                .route(
                                    "/__tuono/data/docs/{*slug}",
                                    get(docs_dyn_catch_all_slug_page::tuono_internal_api),
                                )
                                .route(
                                    "/__tuono/static_paths/docs_dyn_catch_all_slug_page",
                                    get(
                                        docs_dyn_catch_all_slug_page::tuono_internal_static_paths,
                                    ),
                                ),
                        ),
                )
                .merge(Router::new())
                .merge(
                    Router::new()
                        .merge(
                            Router::new()
                                .route(
                                    "/pokemons/{pokemon}",
                                    get(pokemons_dyn_pokemon_page::tuono_internal_route),
                                )
                                .route(
                                    "/__tuono/data/pokemons/{pokemon}",
                                    get(pokemons_dyn_pokemon_page::tuono_internal_api),
                                )
                                .route(
                                    "/__tuono/static_paths/pokemons_dyn_pokemon_page",
                                    get(pokemons_dyn_pokemon_page::tuono_internal_static_paths),
                                ),
                        ),
                )
                .route("/", get(page::tuono_internal_route))
                .route("/__tuono/data/", get(page::tuono_internal_api)),
        )
        .layer(middleware::trace_layer());
    Server::init(router, MODE).await.start().await
}
