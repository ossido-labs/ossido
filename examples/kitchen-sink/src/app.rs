//! Application state: a shared Postgres connection pool.
//!
//! The generated `main.rs` calls (and awaits) this `main` once at startup and
//! hands the returned state to every handler and action — a parameter whose
//! name matches a field here (e.g. `db: PgPool`) receives that field.

use sqlx::postgres::PgPoolOptions;

// The traced database handle (`src/db.rs`). Declared here — the app-state
// module — because route files can import shared types from it as
// `crate::ossido_main_state::Db`.
#[path = "db.rs"]
pub mod db;
pub use db::Db;

#[derive(Clone)]
pub struct ApplicationState {
    pub db: Db,
}

pub async fn main() -> ApplicationState {
    // `.env` is ingested before the state initialiser runs, so the typed
    // environment (`src/env.rs`) is available here.
    let database_url = ossido::get_env!(DATABASE_URL);

    let db = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("failed to connect to postgres — is `docker compose up -d` running?");

    // Embedded migrations from ./migrations, applied on startup.
    sqlx::migrate!("./migrations")
        .run(&db)
        .await
        .expect("failed to run database migrations");

    ApplicationState { db: Db(db) }
}
