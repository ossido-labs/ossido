use ossido::axum::Json;
use ossido::{Request, Type, api};

// The traced database handle — every query through it exports an OTel span.
use crate::ossido_main_state::Db;

// `pub` because the generated `#[api]` wrapper is `pub` and returns `Json<Vec<ApiTodo>>`.
#[Type]
#[derive(sqlx::FromRow)]
pub struct ApiTodo {
    pub id: i64,
    pub title: String,
    pub done: bool,
}

/// `GET /api/todos` — the list as plain JSON (CORS-enabled via the API
/// middleware in this directory).
#[api(GET)]
pub async fn list_todos_json(_req: Request, db: Db) -> Json<Vec<ApiTodo>> {
    let todos = sqlx::query_as::<_, ApiTodo>("SELECT id, title, done FROM todos ORDER BY id DESC")
        .fetch_all(&db)
        .await
        .unwrap_or_default();

    Json(todos)
}
