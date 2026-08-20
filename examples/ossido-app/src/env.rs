//! The project's typed environment schema.
//!
//! Fields are read from the OS environment (populated from `.env` files) at
//! startup and parsed to their declared types. `#[public]` fields are also
//! exposed to the frontend through `getEnv` (`@ossido-labs/ossido/env`); the rest
//! stay server-only and are read in Rust with `ossido::get_env!`.

#[ossido::Environment]
pub struct Environment {
    /// Public — available on the client via `getEnv('api_url')`.
    #[public]
    api_url: String,

    /// Public, typed + optional — `getEnv('analytics_enabled')` is `boolean | null`.
    #[public]
    analytics_enabled: Option<bool>,

    /// Server-only secret — never leaves the backend. Named to mirror the env var
    /// directly (SCREAMING_SNAKE_CASE); the `#[ossido::Environment]` macro allows
    /// this without a `non_snake_case` warning. Read with `get_env!(DATABASE_URL)`.
    DATABASE_URL: String,
}
