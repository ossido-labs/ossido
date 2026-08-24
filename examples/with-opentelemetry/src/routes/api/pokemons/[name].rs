use ossido::axum::Json;
use ossido::{Logger, Request, Type, api, tracing};

// `pub` because the generated `#[api]` wrapper is `pub` and returns `Json<Pokemon>`.
#[Type]
pub struct Pokemon {
    name: String,
    level: u32,
}

// User-land tracing: with OpenTelemetry enabled (set
// `OTEL_EXPORTER_OTLP_ENDPOINT`), this becomes a child span of the request's
// auto-created server/handler spans, with `name` recorded as an attribute.
// Without it, the attribute is a no-op.
#[tracing::instrument]
fn level_for(name: &str) -> u32 {
    name.len() as u32
}

#[api(GET)]
pub async fn get_pokemon(req: Request, logger: Logger) -> Json<Pokemon> {
    let name = req.params.get("name").cloned().unwrap_or_default();
    let level = level_for(&name);
    // Framework logs export over OTLP too, correlated to the request's trace.
    logger.info(format!("resolved pokemon {name}"));
    Json(Pokemon { name, level })
}
