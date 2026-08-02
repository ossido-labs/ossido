use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use tuono_lib::{handler, Props, Request, Response};

const POKEMON_API: &str = "https://pokeapi.co/api/v2/pokemon";

#[derive(Debug, Serialize, Deserialize, Props)]
struct Pokemon {
    name: String,
    id: u16,
    weight: u16,
    height: u16,
}

#[handler]
async fn get_pokemon(req: Request, fetch: Client) -> Response {
    // The param `pokemon` is defined in the route filename [pokemon].rs
    let pokemon = req.params.get("pokemon").unwrap();

    match fetch.get(format!("{POKEMON_API}/{pokemon}")).send().await {
        Ok(res) => {
            if res.status() == StatusCode::NOT_FOUND {
                return Response::Props(Props::empty_with_status(StatusCode::NOT_FOUND));
            }

            res.json::<Pokemon>().await.unwrap().into()
        }
        Err(_err) => Response::Props(Props::empty_with_status(
            StatusCode::INTERNAL_SERVER_ERROR,
        )),
    }
}
