use std::fmt::Display;

use ossido_internal::log::{self, Level};

use crate::Request;

/// A request-scoped, handler-facing logger.
///
/// Declare a `logger` parameter on a `#[handler]` / `#[api]` function and the
/// framework provides it automatically — it does **not** need to be added to
/// `ApplicationState`, and it works whether or not the app has custom state:
///
/// ```ignore
/// #[ossido::handler]
/// async fn get_pokemon(req: Request, fetch: Client, logger: ossido::Logger) -> Response {
///     logger.info("fetching a pokemon");
///     // …
/// }
/// ```
///
/// Its methods emit `[BE]` log lines (in the active pretty / json format) tagged
/// with the request path, so a handler's logs are tied to the request.
#[derive(Debug, Clone, Default)]
pub struct Logger {
    path: String,
}

impl Logger {
    /// Build a logger scoped to `request`.
    pub fn new(request: &Request) -> Self {
        Logger {
            path: request.uri.path().to_string(),
        }
    }

    pub fn trace(&self, message: impl Display) {
        log::backend_request(Level::Trace, message, &self.path);
    }

    pub fn debug(&self, message: impl Display) {
        log::backend_request(Level::Debug, message, &self.path);
    }

    pub fn info(&self, message: impl Display) {
        log::backend_request(Level::Info, message, &self.path);
    }

    pub fn warn(&self, message: impl Display) {
        log::backend_request(Level::Warn, message, &self.path);
    }

    pub fn error(&self, message: impl Display) {
        log::backend_request(Level::Error, message, &self.path);
    }
}
