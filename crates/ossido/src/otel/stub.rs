//! No-op stand-in for the [`otel`](super) module when the `telemetry` cargo
//! feature is disabled. Keeps every call site compiling unchanged; `tracing`
//! spans created elsewhere hit the no-subscriber fast path.

pub(crate) fn enabled() -> bool {
    false
}

pub(crate) fn init() {}

pub(crate) fn force_flush() {}

pub(crate) fn shutdown() {}

pub(crate) fn request_span<B>(_req: &http::Request<B>) -> tracing::Span {
    tracing::Span::none()
}
