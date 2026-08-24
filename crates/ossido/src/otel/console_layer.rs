//! Bridges `tracing` *events* (user `tracing::info!` etc.) into the ossido
//! console logger. Printing through [`log::backend`] also forwards the event
//! to the installed OTLP log sink, so one event yields console output and an
//! OTLP log record from a single path.

use ossido_internal::log::{self, Level};
use tracing::field::{Field, Visit};
use tracing::{Event, Subscriber};
use tracing_subscriber::layer::{Context, Layer};

pub(crate) struct ConsoleEventLayer;

fn level(level: &tracing::Level) -> Level {
    match *level {
        tracing::Level::ERROR => Level::Error,
        tracing::Level::WARN => Level::Warn,
        tracing::Level::INFO => Level::Info,
        tracing::Level::DEBUG => Level::Debug,
        tracing::Level::TRACE => Level::Trace,
    }
}

/// Collects an event's `message` plus its other fields as ` key=value` pairs.
#[derive(Default)]
struct MessageVisitor {
    message: String,
    fields: String,
}

impl MessageVisitor {
    fn render(self) -> String {
        match (self.message.is_empty(), self.fields.is_empty()) {
            (false, false) => format!("{}{}", self.message, self.fields),
            (false, true) => self.message,
            (true, _) => self.fields.trim_start().to_string(),
        }
    }
}

impl Visit for MessageVisitor {
    fn record_debug(&mut self, field: &Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.message = format!("{value:?}");
        } else {
            self.fields
                .push_str(&format!(" {}={value:?}", field.name()));
        }
    }

    fn record_str(&mut self, field: &Field, value: &str) {
        if field.name() == "message" {
            self.message = value.to_string();
        } else {
            self.fields.push_str(&format!(" {}={value}", field.name()));
        }
    }
}

impl<S: Subscriber> Layer<S> for ConsoleEventLayer {
    fn on_event(&self, event: &Event<'_>, _ctx: Context<'_, S>) {
        let mut visitor = MessageVisitor::default();
        event.record(&mut visitor);
        log::backend(level(event.metadata().level()), visitor.render());
    }
}
