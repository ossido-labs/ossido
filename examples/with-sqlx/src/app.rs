//! Application state: a shared SQLite connection pool. Handlers and actions
//! receive it by declaring a parameter named after the field (`db: SqlitePool`).

use std::str::FromStr;

use sqlx::SqlitePool;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

#[derive(Clone)]
pub struct ApplicationState {
    pub db: SqlitePool,
}

pub async fn main() -> ApplicationState {
    let database_url = ossido::get_env!(DATABASE_URL);

    let options = SqliteConnectOptions::from_str(&database_url)
        .expect("DATABASE_URL is not a valid sqlite connection string")
        .create_if_missing(true);

    let db = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .expect("failed to open the sqlite database");

    // The simplest schema setup: one statement at startup. For versioned
    // `sqlx::migrate!` migrations, see the `kitchen-sink` example.
    sqlx::query("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL)")
        .execute(&db)
        .await
        .expect("failed to create the notes table");

    ApplicationState { db }
}
