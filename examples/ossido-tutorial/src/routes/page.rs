use reqwest::Client;
use ossido::{handler, Props, Request, Type};

const ALL_POKEMON: &str = "https://pokeapi.co/api/v2/pokemon?limit=151";

#[Props]
#[derive(Debug)]
struct Pokemons {
    results: Vec<Pokemon>,
}

#[Type]
#[derive(Debug)]
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
