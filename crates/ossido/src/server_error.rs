use std::any::Any;
use std::backtrace::Backtrace;
use std::cell::RefCell;
use std::future::Future;
use std::panic::{self, AssertUnwindSafe};
use std::sync::Once;

use futures_util::FutureExt;
use serde::Serialize;

/// Structured error sent to the client so an unexpected panic inside a Ossido
/// handler can surface in the development error overlay (`DevErrorOverlay` on
/// the client) exactly like a JavaScript error.
///
/// Only ever serialized in [`Mode::Dev`](crate::Mode) — the production error
/// paths return a detail-free `500` so source/stack are never leaked.
#[derive(Debug, Clone, Serialize)]
pub struct ServerError {
    /// Shown as the error label in the overlay (e.g. `RustPanic`).
    pub name: String,
    /// The panic message.
    pub message: String,
    /// A JS-style stack string: the panic location as the top `at …` frame,
    /// followed by the captured backtrace. Parsed by the client overlay.
    pub stack: String,
    /// The panic-site source file (read from disk in dev), so the overlay can
    /// render a syntax-highlighted excerpt around the offending line. `None` if
    /// the location is unknown or the file could not be read.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<ErrorSource>,
}

/// The source file at the panic site, embedded so the client overlay can show a
/// highlighted excerpt without needing a sourcemap (Rust has none).
#[derive(Debug, Clone, Serialize)]
pub struct ErrorSource {
    /// Path as recorded by the compiler (relative to the crate root).
    pub file: String,
    pub line: u32,
    pub column: u32,
    /// Full file contents; the client slices and highlights a window around
    /// `line`.
    pub content: String,
}

impl ErrorSource {
    fn read(location: &PanicLocation) -> Option<ErrorSource> {
        let content = std::fs::read_to_string(&location.file).ok()?;
        Some(ErrorSource {
            file: location.file.clone(),
            line: location.line,
            column: location.column,
            content,
        })
    }
}

/// The `file:line:col` a panic originated from.
struct PanicLocation {
    file: String,
    line: u32,
    column: u32,
}

/// Panic details captured by the hook before the stack unwinds — the caught
/// unwind payload alone carries only the message, not a location or backtrace.
struct CapturedPanic {
    location: Option<PanicLocation>,
    backtrace: String,
}

thread_local! {
    static LAST_PANIC: RefCell<Option<CapturedPanic>> = const { RefCell::new(None) };
}

static INSTALL_HOOK: Once = Once::new();

/// Install a panic hook (idempotent) that records each panic's source location
/// and backtrace into a thread-local so [`catch_handler`] can attach them to the
/// resulting [`ServerError`]. It replaces the default hook (which prints the raw
/// `thread '…' panicked at …` dump) — a caught handler panic is instead surfaced
/// as the rich `[BE] ERROR` template + the client overlay.
///
/// Only called in development; production never captures backtraces.
pub fn install_dev_panic_hook() {
    INSTALL_HOOK.call_once(|| {
        // Drop the default hook; the captured panic is reported via the logger.
        let _ = panic::take_hook();
        panic::set_hook(Box::new(move |info| {
            let location = info.location().map(|loc| PanicLocation {
                // Normalise to `/`: on Windows `Location::file()` joins the
                // generated main.rs dir with the module `#[path]` using `\`
                // (e.g. `.ossido\..\src\routes\...`). Forward slashes still read
                // fine via `fs` on Windows and give a portable path in the
                // overlay / `[BE]` log.
                file: loc.file().replace('\\', "/"),
                line: loc.line(),
                column: loc.column(),
            });
            let backtrace = Backtrace::force_capture().to_string();
            LAST_PANIC.with(|cell| {
                *cell.borrow_mut() = Some(CapturedPanic {
                    location,
                    backtrace,
                });
            });
        }));
    });
}

fn panic_message(payload: &(dyn Any + Send)) -> String {
    if let Some(message) = payload.downcast_ref::<&str>() {
        (*message).to_string()
    } else if let Some(message) = payload.downcast_ref::<String>() {
        message.clone()
    } else {
        "Unknown panic".to_string()
    }
}

impl ServerError {
    fn from_panic(payload: Box<dyn Any + Send>) -> ServerError {
        let message = panic_message(payload.as_ref());
        let captured = LAST_PANIC.with(|cell| cell.borrow_mut().take());

        let mut stack = String::new();
        let mut source = None;
        if let Some(captured) = captured {
            if let Some(location) = &captured.location {
                // Emit the panic site as a JS-style top frame so the client
                // stack parser highlights it as the application frame.
                stack.push_str(&format!(
                    "    at {}:{}:{}\n",
                    location.file, location.line, location.column
                ));
                source = ErrorSource::read(location);
            }
            stack.push_str(&captured.backtrace);
        }

        ServerError {
            name: "RustPanic".to_string(),
            message,
            stack,
            source,
        }
    }

    /// Log this error to the server console
    pub fn log(&self) {
        ossido_internal::log::error(ossido_internal::log::Source::Backend, &self.to_report());
    }

    fn to_report(&self) -> ossido_internal::log::ErrorReport {
        use ossido_internal::log::{CodeLocation, ErrorReport};

        // Only the panic-site frame is shown; the full backtrace is too noisy
        // for the console (it lives on in the client overlay).
        let stack = self
            .stack
            .lines()
            .find(|line| line.trim_start().starts_with("at "))
            .map(|line| vec![line.trim().to_string()])
            .unwrap_or_default();

        let location = self.source.as_ref().map(|source| {
            // The compiler records the file `#[path]`d from `.ossido/` (e.g.
            // `.ossido/../src/routes/…`). Canonicalize it, then show it relative
            // to the project so the path is clean and clickable.
            let abs = std::fs::canonicalize(&source.file).ok();
            let display = abs
                .as_ref()
                .and_then(|abs| {
                    let cwd = std::env::current_dir().ok()?;
                    abs.strip_prefix(&cwd)
                        .ok()
                        .map(|rel| rel.to_string_lossy().into_owned())
                })
                .unwrap_or_else(|| source.file.trim_start_matches("../").to_string())
                // Portable separators in the overlay regardless of which branch
                // produced the path (Windows `to_string_lossy` yields `\`).
                .replace('\\', "/");

            CodeLocation {
                file: display,
                abs_file: abs.map(|path| path.to_string_lossy().into_owned()),
                line: source.line,
                column: source.column,
                content: source.content.clone(),
            }
        });

        ErrorReport {
            name: self.name.clone(),
            message: self.message.clone(),
            stack,
            location,
            extra: Vec::new(),
        }
    }
}

/// Run a Ossido handler future, catching any panic and converting it into a
/// [`ServerError`]. Used by the `#[handler]`-generated route/api functions so an
/// unexpected panic surfaces as a structured error instead of tearing down the
/// connection.
pub async fn catch_handler<F, T>(fut: F) -> Result<T, ServerError>
where
    F: Future<Output = T>,
{
    // Timed under `DEBUG=1` so each handler in the chain appears in the request
    // trace; a no-op otherwise.
    crate::debug::time_async("handler", async {
        match AssertUnwindSafe(fut).catch_unwind().await {
            Ok(value) => Ok(value),
            Err(payload) => Err(ServerError::from_panic(payload)),
        }
    })
    .await
}
