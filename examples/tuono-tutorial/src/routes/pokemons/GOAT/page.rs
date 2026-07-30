// src/routes/pokemons/GOAT.rs
use tuono_lib::{handler, Request, Response};

#[handler]
async fn redirect_to_goat(_req: Request) -> Response {
    Response::Redirect("/pokemons/mewtwo".to_string())
}
