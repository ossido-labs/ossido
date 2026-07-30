//! Tuono's unified logger.
//!
//! Every log line is a single line of the form `[TAG] LEVEL HH:MM:SS - message`,
//! where `TAG` identifies the source process (`BE` = Rust backend, `FE` =
//! frontend: browser / vite / ssr) and is coloured (BE magenta, FE cyan) so the
//! origin is obvious at a glance. Errors render a richer multi-line template
//! with the stack, a highlighted code frame and a link to the source.
//!
//! The output format is chosen once at start-up via [`set_format`]:
//! - [`LogFormat::Pretty`] — the human, coloured form described above (default).
//! - [`LogFormat::Json`] — one JSON object per line using GCP Cloud Logging
//!   field names (`severity`/`message`/`timestamp`), for production log
//!   aggregation.

use std::fmt::Display;
use std::sync::OnceLock;

use colored::{ColoredString, Colorize};
use serde::{Deserialize, Serialize};

/// Which process a log line originated from.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Source {
    /// The Rust backend — the server or the CLI.
    Backend,
    /// The frontend — browser console logs, vite, or the SSR bundler.
    Frontend,
}

impl Source {
    /// The short tag rendered in brackets (`BE` / `FE`).
    pub fn tag(self) -> &'static str {
        match self {
            Source::Backend => "BE",
            Source::Frontend => "FE",
        }
    }

    fn colored_tag(self) -> ColoredString {
        let tag = format!("[{}]", self.tag());
        match self {
            // BE is purple/magenta, FE is cyan.
            Source::Backend => tag.magenta().bold(),
            Source::Frontend => tag.cyan().bold(),
        }
    }
}

/// Log severity, ordered `Trace < Debug < Info < Warn < Error` for level
/// filtering (see the browser log level config).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Level {
    Trace,
    Debug,
    #[default]
    Info,
    Warn,
    Error,
}

impl Level {
    fn label(self) -> &'static str {
        match self {
            Level::Trace => "TRACE",
            Level::Debug => "DEBUG",
            Level::Info => "INFO",
            Level::Warn => "WARN",
            Level::Error => "ERROR",
        }
    }

    /// GCP Cloud Logging `severity` value.
    fn severity(self) -> &'static str {
        match self {
            Level::Trace => "DEBUG",
            Level::Debug => "DEBUG",
            Level::Info => "INFO",
            Level::Warn => "WARNING",
            Level::Error => "ERROR",
        }
    }

    fn colorize(self, text: &str) -> ColoredString {
        match self {
            Level::Error => text.red().bold(),
            Level::Warn => text.yellow(),
            Level::Info => text.green(),
            Level::Debug => text.blue(),
            Level::Trace => text.dimmed(),
        }
    }

    /// Parse a browser console method name / level string.
    pub fn from_str_lenient(value: &str) -> Level {
        match value.to_ascii_lowercase().as_str() {
            "trace" => Level::Trace,
            "debug" => Level::Debug,
            "warn" | "warning" => Level::Warn,
            "error" => Level::Error,
            // `log`, `info` and anything unknown map to info.
            _ => Level::Info,
        }
    }
}

/// The rendering style for log lines.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogFormat {
    /// Human, coloured, single line (default).
    #[default]
    Pretty,
    /// One JSON object per line (GCP Cloud Logging compatible).
    Json,
}

static FORMAT: OnceLock<LogFormat> = OnceLock::new();

/// Set the active log format for this process. Idempotent — the first call
/// wins; typically called once at start-up from the config.
pub fn set_format(format: LogFormat) {
    let _ = FORMAT.set(format);
}

/// Honour the [`NO_COLOR`](https://no-color.org) convention: when `NO_COLOR` is
/// set to a non-empty value, disable all ANSI colours for this process
/// (authoritatively — it wins over `CLICOLOR_FORCE` and TTY detection). Call
/// once at start-up, before anything is logged.
pub fn honor_no_color() {
    if std::env::var_os("NO_COLOR").is_some_and(|value| !value.is_empty()) {
        colored::control::set_override(false);
    }
}

fn active_format() -> LogFormat {
    FORMAT.get().copied().unwrap_or_default()
}

fn now_local_hms() -> String {
    jiff::Zoned::now().strftime("%H:%M:%S").to_string()
}

fn now_rfc3339() -> String {
    jiff::Timestamp::now().to_string()
}

/// A source location + file contents used to render a highlighted code frame.
#[derive(Debug, Clone)]
pub struct CodeLocation {
    /// Path shown in the frame — relative to the project so terminals/IDEs make
    /// it clickable.
    pub file: String,
    /// Absolute path for an OSC 8 hyperlink (optional).
    pub abs_file: Option<String>,
    pub line: u32,
    pub column: u32,
    /// Full contents of `file`; a window around `line` is rendered.
    pub content: String,
}

/// A structured error to render with the rich template (header + stack + code
/// frame + extras). Backend errors come from `ServerError`; frontend errors are
/// forwarded from the browser.
#[derive(Debug, Clone, Default)]
pub struct ErrorReport {
    /// Error class, e.g. `Error` / `RustPanic`.
    pub name: String,
    pub message: String,
    /// Formatted stack frames (each already `at …:line:col`), innermost first.
    pub stack: Vec<String>,
    /// Location for the highlighted code frame.
    pub location: Option<CodeLocation>,
    /// Extra key/value details rendered after the frame (e.g. `digest`).
    pub extra: Vec<(String, String)>,
}

/// Log a plain backend (`[BE]`) message.
pub fn backend(level: Level, message: impl Display) {
    emit(Source::Backend, level, &message.to_string());
}

/// Log a plain frontend (`[FE]`) message.
pub fn frontend(level: Level, message: impl Display) {
    emit(Source::Frontend, level, &message.to_string());
}

/// Log a backend (`[BE]`) message scoped to a request path (emitted by a
/// request `Logger`). The path is shown as trailing context in pretty mode and
/// as a `path` field in json mode, so a handler's logs can be tied to a request.
pub fn backend_request(level: Level, message: impl Display, path: &str) {
    let message = message.to_string();
    match active_format() {
        LogFormat::Pretty => {
            let base = pretty_line(Source::Backend, level, &message);
            println!("{base} {} {}", "-".dimmed(), path.dimmed());
        }
        LogFormat::Json => {
            println!(
                "{}",
                serde_json::json!({
                    "severity": level.severity(),
                    "message": message,
                    "timestamp": now_rfc3339(),
                    "source": Source::Backend.tag(),
                    "path": path,
                })
            );
        }
    }
}

/// Log a structured error with the rich template.
pub fn error(source: Source, report: &ErrorReport) {
    match active_format() {
        LogFormat::Pretty => println!("{}", pretty_error(source, report)),
        LogFormat::Json => println!("{}", json_error(source, report)),
    }
}

fn emit(source: Source, level: Level, message: &str) {
    match active_format() {
        LogFormat::Pretty => println!("{}", pretty_line(source, level, message)),
        LogFormat::Json => println!("{}", json_line(source, level, message)),
    }
}

fn pretty_line(source: Source, level: Level, message: &str) -> String {
    let tag = source.colored_tag();
    let level_str = level.colorize(level.label());
    let time = now_local_hms().dimmed();
    format!("{tag} {level_str} {time} - {message}")
}

fn json_line(source: Source, level: Level, message: &str) -> String {
    serde_json::json!({
        "severity": level.severity(),
        "message": message,
        "timestamp": now_rfc3339(),
        "source": source.tag(),
    })
    .to_string()
}

fn pretty_error(source: Source, report: &ErrorReport) -> String {
    let header = if report.name.is_empty() {
        report.message.clone()
    } else {
        format!("{}: {}", report.name, report.message)
    };
    let mut out = pretty_line(source, Level::Error, &header);

    for frame in &report.stack {
        out.push_str(&format!("\n    {}", frame.dimmed()));
    }

    if let Some(location) = &report.location {
        let link = location_link(location);
        out.push_str(&format!("\n    {} {}", "→".dimmed(), link));
        out.push('\n');
        out.push_str(&code_frame(location));
    }

    for (key, value) in &report.extra {
        out.push_str(&format!("\n    {}: {}", key.dimmed(), value));
    }

    out
}

fn json_error(source: Source, report: &ErrorReport) -> String {
    let mut value = serde_json::json!({
        "severity": Level::Error.severity(),
        "message": format!("{}: {}", report.name, report.message),
        "timestamp": now_rfc3339(),
        "source": source.tag(),
    });
    let map = value.as_object_mut().expect("json object");
    if !report.stack.is_empty() {
        map.insert(
            "stack_trace".to_string(),
            serde_json::Value::String(report.stack.join("\n")),
        );
    }
    if let Some(location) = &report.location {
        map.insert(
            "sourceLocation".to_string(),
            serde_json::json!({
                "file": location.file,
                "line": location.line,
                "column": location.column,
            }),
        );
    }
    for (key, val) in &report.extra {
        map.entry(key.clone())
            .or_insert_with(|| serde_json::Value::String(val.clone()));
    }
    value.to_string()
}

/// A clickable location: `file:line:col`, hyperlinked to the absolute path via
/// OSC 8 when known (terminals that don't support it still show the path, which
/// IDE terminals linkify from the project-relative form).
fn location_link(location: &CodeLocation) -> String {
    let text = format!("{}:{}:{}", location.file, location.line, location.column);
    match &location.abs_file {
        Some(abs) => hyperlink(&format!("file://{abs}"), &text),
        None => text,
    }
}

/// Wrap `text` in an OSC 8 terminal hyperlink pointing at `url`.
fn hyperlink(url: &str, text: &str) -> String {
    format!("\u{1b}]8;;{url}\u{1b}\\{text}\u{1b}]8;;\u{1b}\\")
}

/// A Babel-style code frame: a few lines of context around `line`, with `>`
/// marking the offending line and a `^` caret under `column`.
fn code_frame(location: &CodeLocation) -> String {
    const CONTEXT: usize = 2;

    let lines: Vec<&str> = location.content.lines().collect();
    if lines.is_empty() {
        return String::new();
    }

    let target = location.line as usize; // 1-based
    let start = target.saturating_sub(CONTEXT).max(1);
    let end = (target + CONTEXT).min(lines.len());
    let gutter = end.to_string().len();

    let mut out = String::new();
    for number in start..=end {
        let code = lines.get(number - 1).copied().unwrap_or_default();
        let is_target = number == target;
        let marker = if is_target {
            ">".red().bold().to_string()
        } else {
            " ".to_string()
        };
        let gutter_str = format!("{number:>gutter$}");
        let gutter_str = if is_target {
            gutter_str.red().to_string()
        } else {
            gutter_str.dimmed().to_string()
        };
        // `  {marker} {number} | {code}`
        out.push_str(&format!(
            "  {marker} {gutter_str} {} {code}\n",
            "|".dimmed()
        ));

        if is_target && location.column > 0 {
            // Caret line: blank gutter, aligned `|`, then `^` under the column.
            let indent = " ".repeat(gutter + 5);
            let caret_pad = " ".repeat((location.column as usize).saturating_sub(1));
            out.push_str(&format!(
                "{indent}{} {caret_pad}{}\n",
                "|".dimmed(),
                "^".red().bold()
            ));
        }
    }
    // Drop the trailing newline; the caller controls spacing.
    out.pop();
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn level_ordering_supports_filtering() {
        assert!(Level::Error > Level::Warn);
        assert!(Level::Warn > Level::Info);
        assert!(Level::Info > Level::Debug);
        assert!(Level::Debug > Level::Trace);
    }

    #[test]
    fn parses_browser_levels() {
        assert_eq!(Level::from_str_lenient("warn"), Level::Warn);
        assert_eq!(Level::from_str_lenient("warning"), Level::Warn);
        assert_eq!(Level::from_str_lenient("error"), Level::Error);
        assert_eq!(Level::from_str_lenient("debug"), Level::Debug);
        assert_eq!(Level::from_str_lenient("log"), Level::Info);
        assert_eq!(Level::from_str_lenient("info"), Level::Info);
        assert_eq!(Level::from_str_lenient("nonsense"), Level::Info);
    }

    #[test]
    fn code_frame_marks_the_offending_line() {
        let location = CodeLocation {
            file: "src/routes/test/page.rs".to_string(),
            abs_file: None,
            line: 3,
            column: 5,
            content: "line one\nline two\nboom here\nline four\nline five\n".to_string(),
        };
        let frame = code_frame(&location);
        // The offending line is marked and its content is present.
        assert!(frame.contains("boom here"));
        assert!(frame.contains('>'));
        assert!(frame.contains('^'));
        // Context lines around it are included.
        assert!(frame.contains("line two"));
        assert!(frame.contains("line four"));
    }

    #[test]
    fn json_line_uses_gcp_field_names() {
        let line = json_line(Source::Backend, Level::Warn, "hello");
        let value: serde_json::Value = serde_json::from_str(&line).unwrap();
        assert_eq!(value["severity"], "WARNING");
        assert_eq!(value["message"], "hello");
        assert_eq!(value["source"], "BE");
        assert!(value["timestamp"].is_string());
    }

    /// Remove ANSI CSI colour codes (`\x1b[…m`) so pretty output can be asserted
    /// exactly regardless of whether `colored` decides to emit escapes.
    fn strip_csi(input: &str) -> String {
        let mut out = String::new();
        let mut chars = input.chars().peekable();
        while let Some(c) = chars.next() {
            if c == '\u{1b}' && chars.peek() == Some(&'[') {
                chars.next(); // consume '['
                for next in chars.by_ref() {
                    if next.is_ascii_alphabetic() {
                        break; // terminating byte (e.g. 'm')
                    }
                }
            } else {
                out.push(c);
            }
        }
        out
    }

    #[test]
    fn source_tags_are_be_and_fe() {
        assert_eq!(Source::Backend.tag(), "BE");
        assert_eq!(Source::Frontend.tag(), "FE");
    }

    #[test]
    fn levels_map_to_labels_and_gcp_severities() {
        for (level, label, severity) in [
            (Level::Trace, "TRACE", "DEBUG"),
            (Level::Debug, "DEBUG", "DEBUG"),
            (Level::Info, "INFO", "INFO"),
            (Level::Warn, "WARN", "WARNING"),
            (Level::Error, "ERROR", "ERROR"),
        ] {
            assert_eq!(level.label(), label);
            assert_eq!(level.severity(), severity);
        }
    }

    #[test]
    fn pretty_line_follows_the_tag_level_time_message_shape() {
        let line = strip_csi(&pretty_line(Source::Backend, Level::Info, "hello"));
        // `[BE] INFO HH:MM:SS - hello` — a single space between each field.
        assert!(line.starts_with("[BE] INFO "), "got: {line}");
        assert!(line.ends_with(" - hello"), "got: {line}");
        // The timestamp between the level and the ` - ` is `HH:MM:SS`.
        let time = line
            .trim_start_matches("[BE] INFO ")
            .trim_end_matches(" - hello");
        assert_eq!(time.len(), 8, "expected HH:MM:SS, got: {time:?}");
        assert_eq!(time.matches(':').count(), 2);

        // The frontend tag is `[FE]`.
        let fe = strip_csi(&pretty_line(Source::Frontend, Level::Error, "boom"));
        assert!(fe.starts_with("[FE] ERROR "), "got: {fe}");
    }

    #[test]
    fn pretty_error_renders_header_stack_link_frame_and_extras() {
        let report = ErrorReport {
            name: "TypeError".to_string(),
            message: "bad thing".to_string(),
            stack: vec!["at handler (src/routes/test/page.rs:3:5)".to_string()],
            location: Some(CodeLocation {
                file: "src/routes/test/page.rs".to_string(),
                abs_file: None,
                line: 3,
                column: 5,
                content: "a\nb\nboom here\nc\nd\n".to_string(),
            }),
            extra: vec![("digest".to_string(), "3695431866".to_string())],
        };

        let out = strip_csi(&pretty_error(Source::Backend, &report));
        // Header combines name + message on the first line.
        assert!(out.starts_with("[BE] ERROR "), "got: {out}");
        assert!(out.contains("- TypeError: bad thing"));
        // Stack frame, source link and the highlighted code frame.
        assert!(out.contains("at handler (src/routes/test/page.rs:3:5)"));
        assert!(out.contains("→ src/routes/test/page.rs:3:5"));
        assert!(out.contains("boom here"));
        assert!(out.contains('>'));
        assert!(out.contains('^'));
        // Extras rendered as `key: value`.
        assert!(out.contains("digest: 3695431866"));
    }

    #[test]
    fn pretty_error_without_name_uses_message_as_header() {
        let report = ErrorReport {
            message: "just a message".to_string(),
            ..Default::default()
        };
        let out = strip_csi(&pretty_error(Source::Frontend, &report));
        assert!(out.contains("- just a message"));
        // No `name:` prefix when the name is empty.
        assert!(!out.contains(": just a message"));
    }

    #[test]
    fn json_error_uses_gcp_field_names_and_nested_location() {
        let report = ErrorReport {
            name: "RustPanic".to_string(),
            message: "boom".to_string(),
            stack: vec!["at a".to_string(), "at b".to_string()],
            location: Some(CodeLocation {
                file: "src/x.rs".to_string(),
                abs_file: Some("/abs/src/x.rs".to_string()),
                line: 7,
                column: 2,
                content: String::new(),
            }),
            extra: vec![("digest".to_string(), "123".to_string())],
        };

        let value: serde_json::Value =
            serde_json::from_str(&json_error(Source::Backend, &report)).unwrap();
        assert_eq!(value["severity"], "ERROR");
        assert_eq!(value["message"], "RustPanic: boom");
        assert_eq!(value["source"], "BE");
        assert_eq!(value["stack_trace"], "at a\nat b");
        assert_eq!(value["sourceLocation"]["file"], "src/x.rs");
        assert_eq!(value["sourceLocation"]["line"], 7);
        assert_eq!(value["sourceLocation"]["column"], 2);
        assert_eq!(value["digest"], "123");
    }

    #[test]
    fn json_error_omits_optional_fields_when_absent() {
        let report = ErrorReport {
            name: "Error".to_string(),
            message: "nope".to_string(),
            ..Default::default()
        };
        let value: serde_json::Value =
            serde_json::from_str(&json_error(Source::Frontend, &report)).unwrap();
        assert!(value.get("stack_trace").is_none());
        assert!(value.get("sourceLocation").is_none());
    }

    #[test]
    fn location_link_hyperlinks_only_when_absolute_path_is_known() {
        let mut location = CodeLocation {
            file: "src/x.rs".to_string(),
            abs_file: None,
            line: 3,
            column: 5,
            content: String::new(),
        };
        // Without an absolute path, it is plain `file:line:col`.
        assert_eq!(location_link(&location), "src/x.rs:3:5");

        // With one, it is an OSC 8 hyperlink wrapping the same text.
        location.abs_file = Some("/abs/src/x.rs".to_string());
        let linked = location_link(&location);
        assert!(linked.contains("\u{1b}]8;;file:///abs/src/x.rs"));
        assert!(linked.contains("src/x.rs:3:5"));
    }

    #[test]
    fn hyperlink_wraps_text_in_osc8_sequence() {
        assert_eq!(
            hyperlink("file:///a", "label"),
            "\u{1b}]8;;file:///a\u{1b}\\label\u{1b}]8;;\u{1b}\\"
        );
    }

    #[test]
    fn code_frame_caret_sits_under_the_column() {
        let location = CodeLocation {
            file: "x".to_string(),
            abs_file: None,
            line: 1,
            column: 3,
            content: "abcdef".to_string(),
        };
        let frame = strip_csi(&code_frame(&location));
        let caret_line = frame
            .lines()
            .find(|line| line.contains('^'))
            .expect("a caret line");
        // Everything before the caret is whitespace/gutter, and the caret is the
        // final rendered glyph.
        assert!(caret_line.trim_end().ends_with('^'));
    }

    #[test]
    fn code_frame_of_empty_content_is_empty() {
        let location = CodeLocation {
            file: "x".to_string(),
            abs_file: None,
            line: 1,
            column: 1,
            content: String::new(),
        };
        assert_eq!(code_frame(&location), "");
    }

    #[test]
    fn level_and_format_serde_use_lowercase_names() {
        // The config file (de)serializes these, so the wire names matter.
        assert_eq!(serde_json::to_string(&Level::Warn).unwrap(), "\"warn\"");
        assert_eq!(
            serde_json::from_str::<Level>("\"error\"").unwrap(),
            Level::Error
        );
        assert_eq!(serde_json::to_string(&LogFormat::Json).unwrap(), "\"json\"");
        assert_eq!(
            serde_json::from_str::<LogFormat>("\"pretty\"").unwrap(),
            LogFormat::Pretty
        );
        // Level defaults to info; format defaults to pretty.
        assert_eq!(Level::default(), Level::Info);
        assert_eq!(LogFormat::default(), LogFormat::Pretty);
    }
}
