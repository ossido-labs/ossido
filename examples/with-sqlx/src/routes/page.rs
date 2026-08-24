use ossido::{Props, Request, Type, handler};
use sqlx::SqlitePool;

#[Type]
#[derive(sqlx::FromRow)]
pub struct Note {
    pub id: i64,
    pub text: String,
}

#[Props]
struct NoteList {
    notes: Vec<Note>,
}

/// Server-side props: the notes straight from SQLite.
#[handler]
async fn list_notes(_req: Request, db: SqlitePool) -> NoteList {
    let notes = sqlx::query_as::<_, Note>("SELECT id, text FROM notes ORDER BY id DESC")
        .fetch_all(&db)
        .await
        .unwrap_or_default();

    NoteList { notes }
}
