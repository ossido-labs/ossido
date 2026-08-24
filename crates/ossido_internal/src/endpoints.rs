//! The `/__ossido/*` internal endpoint paths, shared by the server crate
//! (route registration, log/telemetry skip rules) and the CLI (codegen'd
//! routes, static-export URLs) so the two sides cannot drift.
//!
//! The TypeScript runtime (`packages/ossido`) spells the same paths in its own
//! constants — a language boundary these consts cannot cross; its tests pin
//! the literal values, as do the CLI codegen tests on this side.

/// Browser `console.*` forwarding intake, printed server-side tagged `[FE]`.
pub const BROWSER_LOGS: &str = "/__ossido/logs";
/// Route-data prefix: `/__ossido/data{route}` serves a page's props JSON.
pub const DATA_PREFIX: &str = "/__ossido/data";
/// Server actions: `POST /__ossido/action/<module>/<fn>`.
pub const ACTION_PREFIX: &str = "/__ossido/action";
/// `#[static_paths]` enumerators: `/__ossido/static_paths/<module>`.
pub const STATIC_PATHS_PREFIX: &str = "/__ossido/static_paths";
/// The single project WebSocket upgrade endpoint.
pub const WS: &str = "/__ossido/ws";
