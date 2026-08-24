use ossido::axum::http::StatusCode;
use ossido::{Props, Request, Response, handler};

// The traced database handle — every query through it exports an OTel span.
use crate::ossido_main_state::Db;

#[Props]
#[derive(sqlx::FromRow)]
struct TodoDetail {
    id: i64,
    title: String,
    done: bool,
    created_at: String,
}

/// With OpenTelemetry enabled (`OTEL_EXPORTER_OTLP_ENDPOINT` set) this becomes
/// a child span of the request's auto-created server/handler spans, with `id`
/// recorded as a span attribute — and the traced `Db` handle nests a
/// `SELECT todos` span (with the `db.*` semconv attributes) inside it.
#[tracing::instrument(skip(db))]
async fn find_todo(db: &Db, id: i64) -> Result<Option<TodoDetail>, sqlx::Error> {
    sqlx::query_as::<_, TodoDetail>(
        "SELECT id, title, done, created_at::text AS created_at FROM todos WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(db)
    .await
}

#[handler]
async fn get_todo(req: Request, db: Db) -> Response {
    // The param `id` is defined by the route directory name `[id]`.
    let Some(id) = req.params.get("id").and_then(|raw| raw.parse::<i64>().ok()) else {
        return Response::Props(Props::empty_with_status(StatusCode::NOT_FOUND));
    };

    match find_todo(&db, id).await {
        Ok(Some(todo)) => todo.into(),
        Ok(None) => Response::Props(Props::empty_with_status(StatusCode::NOT_FOUND)),
        Err(_) => Response::Props(Props::empty_with_status(StatusCode::INTERNAL_SERVER_ERROR)),
    }
}
