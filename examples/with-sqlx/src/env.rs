//! The project's typed environment schema.

#[ossido::Environment]
pub struct Environment {
    /// Server-only: the sqlite connection string used by `src/app.rs`. Read
    /// with `get_env!(DATABASE_URL)`; populated from `.env`.
    DATABASE_URL: String,
}
