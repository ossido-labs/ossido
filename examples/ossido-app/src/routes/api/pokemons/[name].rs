use ossido::axum::Json;
use ossido::{api, Request, Type};

#[Type]
struct Pokemon {
    name: String,
    level: u32,
}

#[api(GET)]
pub async fn get_pokemon(req: Request) -> Json<Pokemon> {
    let name = req.params.get("name").cloned().unwrap_or_default();
    Json(Pokemon { name, level: 5 })
}
