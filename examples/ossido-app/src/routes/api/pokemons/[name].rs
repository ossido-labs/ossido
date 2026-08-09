use ossido::axum::Json;
use ossido::{api, Request, Type};

// `pub` because the generated `#[api]` wrapper is `pub` and returns `Json<Pokemon>`.
#[Type]
pub struct Pokemon {
    name: String,
    level: u32,
}

#[api(GET)]
pub async fn get_pokemon(req: Request) -> Json<Pokemon> {
    let name = req.params.get("name").cloned().unwrap_or_default();
    Json(Pokemon { name, level: 5 })
}
