use std::fmt::Debug;
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

use colored::Colorize;
use http::method::Method;
use http::{Request, Response};
use ossido_internal::log::{self, Level};
use tokio::time::Instant;
use tower::{Layer, Service};

/// Colour an HTTP method by verb (GET green, POST blue, DELETE red, …) so the
/// request log scans at a glance. Uncommon methods keep the default colour.
/// `colored` auto-disables when output is not a TTY or `NO_COLOR` is set.
pub(crate) fn colorize_method(method: &Method) -> colored::ColoredString {
    let text = method.as_str();
    match *method {
        Method::GET => text.green(),
        Method::POST => text.blue(),
        Method::PUT => text.yellow(),
        // Orange (truecolor) to distinguish PATCH from PUT's yellow.
        Method::PATCH => text.truecolor(255, 165, 0),
        Method::DELETE => text.red(),
        Method::HEAD | Method::OPTIONS => text.cyan(),
        _ => text.normal(),
    }
}

#[derive(Clone)]
pub struct LoggerLayer {}

impl LoggerLayer {
    pub fn new() -> Self {
        LoggerLayer {}
    }
}

impl<S> Layer<S> for LoggerLayer {
    type Service = Logger<S>;

    fn layer(&self, inner: S) -> Self::Service {
        Logger::new(inner)
    }
}

#[derive(Clone)]
pub struct Logger<S> {
    inner: S,
}

impl<S> Logger<S> {
    pub fn new(inner: S) -> Self {
        Logger { inner }
    }
}

impl<S, ReqBody, ResBody> Service<Request<ReqBody>> for Logger<S>
where
    S: Service<Request<ReqBody>, Response = Response<ResBody>>,
    S::Future: Send + 'static,
    <S as Service<Request<ReqBody>>>::Error: Debug,
    ResBody: Default,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<ReqBody>) -> Self::Future {
        let method = req.method().clone();
        let path = req.uri().path().to_string();
        let start = Instant::now();

        // Install a per-request timeline (only allocates under `DEBUG=1`) so
        // instrumented phases can record their timings into the current request.
        let timeline = crate::debug::new_timeline();
        let request = crate::debug::scope(timeline.clone(), self.inner.call(req));

        Box::pin(async move {
            let res = request.await;

            // The browser-log intake is always internal noise. The data endpoint
            // (hit by client-side navigation) is normally skipped too, but under
            // `DEBUG=1` it is traced so a navigation's backend cost is visible.
            let is_data = path.starts_with("/__ossido/data");
            if path.starts_with("/__ossido/logs") || (is_data && timeline.is_none()) {
                return res;
            }

            let status_code = res.as_ref().unwrap().status();

            // Surface server/client error responses at a matching level.
            let level = if status_code.is_server_error() {
                Level::Error
            } else if status_code.is_client_error() {
                Level::Warn
            } else {
                Level::Info
            };

            let method = colorize_method(&method);
            let total_ms = start.elapsed().as_secs_f64() * 1000.0;

            match &timeline {
                // `DEBUG=1`: a timed waterfall of the request's sub-tasks.
                Some(timeline) => {
                    let header = format!(
                        "{method} {path} {} in {total_ms:.1}ms",
                        status_code.as_u16()
                    );
                    crate::debug::flush(timeline, level, &header, &path);
                }
                // Normal: a single summary line (duration dimmed). `colored`
                // auto-disables when output is not a TTY or `NO_COLOR` is set, so
                // production/json logs stay free of escape codes.
                None => {
                    let duration = format!("in {total_ms:.0}ms").dimmed();
                    log::backend(
                        level,
                        format!("{method} {path} {} {duration}", status_code.as_u16()),
                    );
                }
            }

            res
        })
    }
}
