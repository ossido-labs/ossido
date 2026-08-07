//! Dev-only intake for browser `console.*` logs.
//!
//! The client (in development) patches `console.*` and POSTs batched entries to
//! `/__ossido/logs`; they are printed in the server console tagged `[FE]`,
//! filtered by the `logging.browser` config.

use colored::Colorize;
use http::method::Method;
use serde::Deserialize;
use ossido_internal::log::{self, ErrorReport, Level, Source};

use crate::config::GLOBAL_CONFIG;

/// A forwarded `Error` object (present when the console call carried one).
#[derive(Debug, Deserialize)]
pub struct BrowserError {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub message: String,
    /// Stack frames, innermost first (browser `Error.stack`, split by line).
    #[serde(default)]
    pub stack: Vec<String>,
}

/// A single forwarded browser event — a `console.*` call or a client-side
/// navigation.
#[derive(Debug, Deserialize)]
pub struct BrowserLogEntry {
    /// The console method (`log`/`info`/`warn`/`error`/`debug`/`trace`).
    pub level: String,
    #[serde(default)]
    pub message: String,
    /// Structured error, if the console call included an `Error`.
    #[serde(default)]
    pub error: Option<BrowserError>,
    /// When `true`, this is a client-side navigation (the `message` is the path).
    #[serde(default)]
    pub navigation: bool,
    /// For a navigation that loaded data: the data response's HTTP status.
    #[serde(default)]
    pub status: Option<u16>,
    /// For a navigation that loaded data: how long the load took, in ms.
    #[serde(rename = "durationMs", default)]
    pub duration_ms: Option<f64>,
}

/// Print forwarded browser logs, honouring the `logging.browser` config. Takes
/// the raw body (not `Json`) because `navigator.sendBeacon` posts as
/// `text/plain`, which the `Json` extractor would reject.
pub async fn browser_logs(body: String) {
    let Some(config) = GLOBAL_CONFIG.get() else {
        return;
    };
    let browser = &config.logging.browser;
    if !browser.enabled {
        return;
    }

    let Ok(entries) = serde_json::from_str::<Vec<BrowserLogEntry>>(&body) else {
        return;
    };

    for entry in entries {
        let level = Level::from_str_lenient(&entry.level);
        if level < browser.level {
            continue;
        }

        // A client-side navigation: log it in the same shape as the backend
        // request log — a colour-coded method (always GET), the path, and (when
        // the navigation loaded data) the data response's status and dimmed
        // duration, exactly as the request log renders them.
        if entry.navigation {
            let method = crate::services::logger::colorize_method(&Method::GET);
            let message = match (entry.status, entry.duration_ms) {
                (Some(status), Some(ms)) => {
                    let duration = format!("in {ms:.0}ms").dimmed();
                    format!("{method} {} {status} {duration}", entry.message)
                }
                _ => format!("{method} {}", entry.message),
            };
            log::frontend(level, message);
            continue;
        }

        match entry.error {
            Some(error) => log::error(
                Source::Frontend,
                &ErrorReport {
                    name: error.name,
                    message: if error.message.is_empty() {
                        entry.message
                    } else {
                        error.message
                    },
                    stack: error.stack,
                    // Source resolution for a browser stack happens in the dev
                    // error overlay; the console shows the header + stack.
                    location: None,
                    extra: Vec::new(),
                },
            ),
            None => log::frontend(level, entry.message),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The batch shape the client's `sendBeacon` posts to `/__ossido/logs`.
    #[test]
    fn parses_a_batch_of_forwarded_console_calls() {
        let body = r#"[
            { "level": "info", "message": "hello from the browser" },
            {
                "level": "error",
                "message": "boom",
                "error": {
                    "name": "TypeError",
                    "message": "x is not a function",
                    "stack": ["at foo (app.tsx:1:1)", "at bar (app.tsx:2:2)"]
                }
            }
        ]"#;

        let entries: Vec<BrowserLogEntry> = serde_json::from_str(body).unwrap();
        assert_eq!(entries.len(), 2);

        assert_eq!(entries[0].level, "info");
        assert_eq!(entries[0].message, "hello from the browser");
        assert!(entries[0].error.is_none());

        let error = entries[1].error.as_ref().expect("error object");
        assert_eq!(error.name, "TypeError");
        assert_eq!(error.message, "x is not a function");
        assert_eq!(error.stack.len(), 2);
        // The forwarded string level maps through the shared lenient parser.
        assert_eq!(Level::from_str_lenient(&entries[1].level), Level::Error);
    }

    /// A client-side navigation report carries `navigation: true` and the path,
    /// plus the data-load status + duration when the navigation loaded data.
    #[test]
    fn parses_a_navigation_entry() {
        let entry: BrowserLogEntry = serde_json::from_str(
            r#"{ "level": "info", "message": "/pokemons/pikachu", "navigation": true }"#,
        )
        .unwrap();
        assert!(entry.navigation);
        assert_eq!(entry.message, "/pokemons/pikachu");
        assert!(entry.status.is_none());
        assert!(entry.duration_ms.is_none());

        let entry: BrowserLogEntry = serde_json::from_str(
            r#"{ "level": "info", "message": "/x", "navigation": true, "status": 200, "durationMs": 12.4 }"#,
        )
        .unwrap();
        assert_eq!(entry.status, Some(200));
        assert_eq!(entry.duration_ms, Some(12.4));
    }

    /// Only `level` is required; everything else falls back to defaults so a
    /// bare `console.log()` with no argument still parses.
    #[test]
    fn fills_defaults_for_missing_fields() {
        let entry: BrowserLogEntry = serde_json::from_str(r#"{ "level": "log" }"#).unwrap();
        assert_eq!(entry.level, "log");
        assert_eq!(entry.message, "");
        assert!(entry.error.is_none());
        // `navigation` defaults to false for ordinary console entries.
        assert!(!entry.navigation);

        // An error object may itself carry only a subset of fields.
        let entry: BrowserLogEntry =
            serde_json::from_str(r#"{ "level": "error", "error": { "message": "oops" } }"#)
                .unwrap();
        let error = entry.error.expect("error object");
        assert_eq!(error.name, "");
        assert_eq!(error.message, "oops");
        assert!(error.stack.is_empty());
    }
}
