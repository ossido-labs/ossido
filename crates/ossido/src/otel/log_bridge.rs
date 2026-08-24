//! The [`LogSink`] implementation that forwards every ossido log record to the
//! OTLP logs pipeline, correlated with the active trace span.

use opentelemetry::logs::{AnyValue, LogRecord as _, Logger as _, LoggerProvider as _, Severity};
use opentelemetry::trace::TraceContextExt;
use opentelemetry_sdk::logs::{SdkLogger, SdkLoggerProvider};
use ossido_internal::log::{Level, LogSink, LogSinkRecord, Source};
use tracing_opentelemetry::OpenTelemetrySpanExt;

pub(crate) struct OtelLogSink {
    logger: SdkLogger,
}

impl OtelLogSink {
    pub(crate) fn new(provider: &SdkLoggerProvider) -> Self {
        Self {
            logger: provider.logger("ossido"),
        }
    }
}

/// Strip ANSI escape sequences (CSI colours and OSC hyperlinks) from a console
/// message. Some log lines are composed with `colored` before reaching the
/// logger (the request summary's method/duration), and when stdout is a TTY
/// those escapes are part of the message — they must not leak into OTLP
/// bodies. Borrow-through for the common escape-free case.
fn strip_ansi(message: &str) -> std::borrow::Cow<'_, str> {
    if !message.contains('\u{1b}') {
        return std::borrow::Cow::Borrowed(message);
    }
    let mut out = String::with_capacity(message.len());
    let mut chars = message.chars().peekable();
    while let Some(c) = chars.next() {
        if c != '\u{1b}' {
            out.push(c);
            continue;
        }
        match chars.peek() {
            // CSI: `ESC [ … <alphabetic>`
            Some('[') => {
                chars.next();
                for next in chars.by_ref() {
                    if next.is_ascii_alphabetic() {
                        break;
                    }
                }
            }
            // OSC: `ESC ] … BEL` or `ESC ] … ESC \`
            Some(']') => {
                chars.next();
                while let Some(next) = chars.next() {
                    if next == '\u{7}' {
                        break;
                    }
                    if next == '\u{1b}' && chars.peek() == Some(&'\\') {
                        chars.next();
                        break;
                    }
                }
            }
            // Two-character escape (e.g. the `ESC \` string terminator).
            _ => {
                chars.next();
            }
        }
    }
    std::borrow::Cow::Owned(out)
}

fn severity(level: Level) -> Severity {
    match level {
        Level::Trace => Severity::Trace,
        Level::Debug => Severity::Debug,
        Level::Info => Severity::Info,
        Level::Warn => Severity::Warn,
        Level::Error => Severity::Error,
    }
}

impl LogSink for OtelLogSink {
    fn emit(&self, record: &LogSinkRecord) {
        let mut log_record = self.logger.create_log_record();
        log_record.set_severity_number(severity(record.level));
        log_record.set_severity_text(record.level.label());
        log_record.set_body(AnyValue::from(strip_ansi(record.message).into_owned()));
        log_record.add_attribute(
            "ossido.log.source",
            match record.source {
                Source::Backend => "backend",
                Source::Frontend => "frontend",
            },
        );
        if let Some(path) = record.path {
            log_record.add_attribute(
                opentelemetry_semantic_conventions::attribute::URL_PATH,
                path.to_string(),
            );
        }
        if let Some(error) = record.error {
            if !error.name.is_empty() {
                log_record.add_attribute(
                    opentelemetry_semantic_conventions::attribute::EXCEPTION_TYPE,
                    error.name.clone(),
                );
            }
            log_record.add_attribute(
                opentelemetry_semantic_conventions::attribute::EXCEPTION_MESSAGE,
                error.message.clone(),
            );
            if !error.stack.is_empty() {
                log_record.add_attribute(
                    opentelemetry_semantic_conventions::attribute::EXCEPTION_STACKTRACE,
                    error.stack.join("\n"),
                );
            }
        }
        for (key, value) in record.extra_attrs {
            log_record.add_attribute(key.to_string(), value.to_string());
        }

        // Correlate with the active request/render span. The span context must
        // come from the *tracing* span (`tracing-opentelemetry` does not attach
        // the otel `Context`), which works on tokio tasks and on render-pool
        // threads alike — the render-job span is entered there.
        let context = tracing::Span::current().context();
        let span = context.span();
        let span_context = span.span_context();
        if span_context.is_valid() {
            log_record.set_trace_context(
                span_context.trace_id(),
                span_context.span_id(),
                Some(span_context.trace_flags()),
            );
        }

        self.logger.emit(log_record);
    }
}
