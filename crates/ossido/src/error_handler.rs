//! A pluggable, process-wide handler for errors thrown by request handlers.
//!
//! Register one from your `src/app.rs` `main()` (which runs before the server
//! starts) to report errors to Sentry (or anything similar) and, optionally, to
//! replace the framework's default `500` with a custom HTTP response:
//!
//! ```ignore
//! pub fn main() -> AppState {
//!     ossido::set_error_handler(|ctx| async move {
//!         reporter.capture(&ctx.error, &ctx.error_id).await;
//!         // Return `Some(response)` to override the default 500, or `None` to
//!         // let Ossido render its standard error page.
//!         None
//!     });
//!     AppState { /* … */ }
//! }
//! ```

use std::future::Future;
use std::pin::Pin;
use std::sync::OnceLock;
use std::sync::atomic::{AtomicU64, Ordering};

use axum::response::Response as AxumResponse;

use crate::mode::{GLOBAL_MODE, Mode};
use crate::{Request, ServerError};

/// Everything a registered error handler is given about a failed request. Owned
/// (not borrowed) so the handler may hold it across an `.await`.
pub struct ErrorContext {
    /// The structured error (name, message, stack, source).
    pub error: ServerError,
    /// The request that failed — call `.pathname()`, read `.params`, etc.
    pub request: Request,
    /// Whether the server is running in development or production.
    pub mode: Mode,
    /// A unique id for this occurrence, so a report (e.g. a Sentry event) and a
    /// user-facing page can be correlated.
    pub error_id: String,
}

type ErrorFuture = Pin<Box<dyn Future<Output = Option<AxumResponse>> + Send>>;
type BoxedErrorHandler = Box<dyn Fn(ErrorContext) -> ErrorFuture + Send + Sync>;

static ERROR_HANDLER: OnceLock<BoxedErrorHandler> = OnceLock::new();

/// Register the process-wide error handler. Call this once, early (typically from
/// `src/app.rs` `main()`); a later call is ignored (the first registration
/// wins).
///
/// The handler runs on every error thrown by a request handler. Return
/// `Some(response)` to send a custom HTTP response, or `None` to fall back to
/// Ossido's default error page / JSON. See the [module docs](self).
pub fn set_error_handler<F, Fut>(handler: F)
where
    F: Fn(ErrorContext) -> Fut + Send + Sync + 'static,
    Fut: Future<Output = Option<AxumResponse>> + Send + 'static,
{
    let boxed: BoxedErrorHandler = Box::new(move |ctx| Box::pin(handler(ctx)));
    // First registration wins; ignore any later calls rather than panicking.
    let _ = ERROR_HANDLER.set(boxed);
}

/// A best-effort unique id for a single error occurrence (`<nanos>-<counter>`),
/// unique within a process run without pulling in a uuid dependency.
pub(crate) fn next_error_id() -> String {
    static COUNTER: AtomicU64 = AtomicU64::new(0);
    let counter = COUNTER.fetch_add(1, Ordering::Relaxed);
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|since| since.as_nanos())
        .unwrap_or(0);
    format!("{nanos:x}-{counter:x}")
}

/// Run the registered error handler, if any, for a failed request. Returns its
/// custom response, or `None` (no handler registered, or the handler declined to
/// override) to fall back to the default error page. A no-op with no allocation
/// when no handler is registered.
pub(crate) async fn run_error_handler(
    request: &Request,
    error: &ServerError,
    error_id: &str,
) -> Option<AxumResponse> {
    let handler = ERROR_HANDLER.get()?;
    let ctx = ErrorContext {
        error: error.clone(),
        request: request.clone(),
        mode: GLOBAL_MODE.get().copied().unwrap_or(Mode::Prod),
        error_id: error_id.to_string(),
    };
    handler(ctx).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_ids_are_unique() {
        let a = next_error_id();
        let b = next_error_id();
        assert_ne!(a, b);
    }
}
