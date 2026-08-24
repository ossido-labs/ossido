use ossido::{Props, Request, Type, handler};

// The traced database handle — every query through it exports an OTel span.
use crate::ossido_main_state::Db;

#[Type]
#[derive(sqlx::FromRow)]
pub struct TodoItem {
    pub id: i64,
    pub title: String,
    pub done: bool,
}

#[Props]
struct TodoList {
    todos: Vec<TodoItem>,
}

/// Server-side props for the index page: the todo list straight from Postgres.
/// The `db` parameter is the `ApplicationState` field of the same name; the
/// query exports a `SELECT todos` span automatically (see `src/db.rs`).
#[handler]
async fn list_todos(_req: Request, db: Db) -> TodoList {
    let todos = sqlx::query_as::<_, TodoItem>("SELECT id, title, done FROM todos ORDER BY id DESC")
        .fetch_all(&db)
        .await
        .unwrap_or_default();

    TodoList { todos }
}
