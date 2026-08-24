//! The project's typed environment schema.
//!
//! Fields are read from the OS environment (populated from `.env` files) at
//! startup and parsed to their declared types. `#[public]` fields are also
//! exposed to the frontend through `getEnv` (`@ossido-labs/ossido/env`); the
//! rest stay server-only and are read in Rust with `ossido::get_env!`.

#[ossido::Environment]
pub struct Environment {
    /// Public — shown in the page footer via `getEnv('app_name')`.
    #[public]
    app_name: String,

    /// Server-only: the postgres connection string used by `src/app.rs` (the
    /// docker-compose database by default). Named to mirror the env var
    /// directly (SCREAMING_SNAKE_CASE); read with `get_env!(DATABASE_URL)`.
    DATABASE_URL: String,
}
