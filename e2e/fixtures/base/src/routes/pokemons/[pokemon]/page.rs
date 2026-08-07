use serde::Serialize;
use ossido_lib::{Props, Request, Response, StaticPaths, Type, handler, static_paths};

#[derive(Serialize, Type)]
struct PokemonResponse {
    name: String,
}

#[handler]
async fn get_server_side_props(req: Request) -> Response {
    let name = req.params.get("pokemon").cloned().unwrap_or_default();
    Response::Props(Props::new(PokemonResponse { name }))
}

#[static_paths]
async fn static_paths(paths: &mut StaticPaths) {
    for name in ["pikachu", "charizard"] {
        paths.register(|params| {
            params.param("pokemon", name);
        });
    }
}
