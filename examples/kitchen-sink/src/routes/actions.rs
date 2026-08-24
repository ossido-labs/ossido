//! Server actions for the todo list. The build generates a typed TypeScript
//! client per action into `.ossido/actions.ts`; see `src/components/TodoApp.tsx`
//! for the React side.

use ossido::{ActionError, Logger, PrevState, Type, action};

// The traced database handle — every query through it exports an OTel span.
use crate::ossido_main_state::Db;

#[Type]
#[derive(sqlx::FromRow)]
pub struct Todo {
    pub id: i64,
    pub title: String,
    pub done: bool,
}

/// Returned by the mutating actions so the client can replace its list state
/// with the authoritative database contents.
#[Type]
pub struct Todos {
    pub todos: Vec<Todo>,
}

#[Type]
pub struct AddTodo {
    pub title: String,
}

/// The `useActionState` state for the add form. `todos` is `None` when the
/// submission was rejected — the client then keeps its current list.
#[Type]
pub struct AddState {
    pub ok: bool,
    pub message: String,
    pub todos: Option<Vec<Todo>>,
}

#[Type]
pub struct ToggleTodo {
    pub id: i64,
}

#[Type]
pub struct DeleteTodo {
    pub id: i64,
}

async fn all_todos(db: &Db) -> Result<Vec<Todo>, sqlx::Error> {
    sqlx::query_as::<_, Todo>("SELECT id, title, done FROM todos ORDER BY id DESC")
        .fetch_all(db)
        .await
}

fn db_error(error: sqlx::Error) -> ActionError {
    // Log the detail server-side; the client gets a generic message.
    ossido::tracing::error!("todo query failed: {error}");
    ActionError::message("the database query failed")
}

/// A stateful action for `useActionState`: validates, inserts, and returns the
/// fresh list (or a validation message).
#[action]
pub async fn add_todo(
    _prev: PrevState<AddState>,
    input: AddTodo,
    db: Db,
    logger: Logger,
) -> AddState {
    let title = input.title.trim();
    if title.is_empty() {
        return AddState {
            ok: false,
            message: "A title is required".into(),
            todos: None,
        };
    }

    let inserted = sqlx::query("INSERT INTO todos (title) VALUES ($1)")
        .bind(title)
        .execute(&db)
        .await;
    if let Err(error) = inserted {
        ossido::tracing::error!("todo insert failed: {error}");
        return AddState {
            ok: false,
            message: "Could not save the todo".into(),
            todos: None,
        };
    }

    logger.info(format!("added todo {title:?}"));
    AddState {
        ok: true,
        message: String::new(),
        todos: all_todos(&db).await.ok(),
    }
}

/// An imperative action: flip a todo's `done` flag and return the fresh list.
#[action]
pub async fn toggle_todo(input: ToggleTodo, db: Db) -> Result<Todos, ActionError> {
    sqlx::query("UPDATE todos SET done = NOT done WHERE id = $1")
        .bind(input.id)
        .execute(&db)
        .await
        .map_err(db_error)?;

    Ok(Todos {
        todos: all_todos(&db).await.map_err(db_error)?,
    })
}

/// An imperative action: delete a todo and return the fresh list.
#[action]
pub async fn delete_todo(input: DeleteTodo, db: Db) -> Result<Todos, ActionError> {
    sqlx::query("DELETE FROM todos WHERE id = $1")
        .bind(input.id)
        .execute(&db)
        .await
        .map_err(db_error)?;

    Ok(Todos {
        todos: all_todos(&db).await.map_err(db_error)?,
    })
}
