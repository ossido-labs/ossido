use reqwest::Client;
use serde::{Deserialize, Serialize};
use ossido_lib::{handler, Props, Request, Type};

const ALL_POKEMON: &str = "https://pokeapi.co/api/v2/pokemon?limit=151";

#[derive(Debug, Props, Type, Serialize, Deserialize)]
struct Pokemons {
    results: Vec<Pokemon>,
}

#[derive(Debug, Type, Serialize, Deserialize)]
struct Pokemon {
    name: String,
    url: String,
}

#[handler]
async fn get_all_pokemon(_req: Request, fetch: Client) -> Pokemons {
    fetch
        .get(ALL_POKEMON)
        .send()
        .await
        .expect("failed to fetch the pokemon list")
        .json()
        .await
        .expect("failed to parse the pokemon list")
}
