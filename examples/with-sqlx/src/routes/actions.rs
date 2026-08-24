use ossido::{ActionError, Type, action};
use sqlx::SqlitePool;

#[Type]
#[derive(sqlx::FromRow)]
pub struct SavedNote {
    pub id: i64,
    pub text: String,
}

#[Type]
pub struct SavedNotes {
    pub notes: Vec<SavedNote>,
}

#[Type]
pub struct AddNote {
    pub text: String,
}

/// Insert a note and return the fresh list; called imperatively from the page
/// (`await addNote({ text })`).
#[action]
pub async fn add_note(input: AddNote, db: SqlitePool) -> Result<SavedNotes, ActionError> {
    if input.text.trim().is_empty() {
        return Err(ActionError::message("a note needs some text"));
    }

    sqlx::query("INSERT INTO notes (text) VALUES (?)")
        .bind(input.text.trim())
        .execute(&db)
        .await
        .map_err(|_| ActionError::message("the insert failed"))?;

    let notes = sqlx::query_as::<_, SavedNote>("SELECT id, text FROM notes ORDER BY id DESC")
        .fetch_all(&db)
        .await
        .map_err(|_| ActionError::message("the query failed"))?;

    Ok(SavedNotes { notes })
}
