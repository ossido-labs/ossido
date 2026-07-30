use std::fmt::Debug;
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

use colored::Colorize;
use http::method::Method;
use http::{Request, Response};
use pin_project::pin_project;
use tokio::time::Instant;
use tower::{Layer, Service};
use tuono_internal::log::{self, Level};

/// Colour an HTTP method by verb (GET green, POST blue, DELETE red, …) so the
/// request log scans at a glance. Uncommon methods keep the default colour.
/// `colored` auto-disables when output is not a TTY or `NO_COLOR` is set.
fn colorize_method(method: &Method) -> colored::ColoredString {
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
    ResBody: Default,
    <S as Service<Request<ReqBody>>>::Error: Debug,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = LoggerFuture<S::Future>;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: Request<ReqBody>) -> Self::Future {
        let method = req.method().clone();
        let path = req.uri().path().to_string();

        LoggerFuture {
            future: self.inner.call(req),
            method,
            path,
            start: Instant::now(),
        }
    }
}

#[pin_project]
pub struct LoggerFuture<F> {
    #[pin]
    future: F,
    method: Method,
    path: String,
    start: Instant,
}

impl<F, B, E> Future for LoggerFuture<F>
where
    F: Future<Output = Result<Response<B>, E>>,
    B: Default,
    E: Debug,
{
    type Output = Result<Response<B>, E>;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        let this = self.project();
        let res: F::Output = match this.future.poll(cx) {
            Poll::Ready(res) => res,
            Poll::Pending => return Poll::Pending,
        };

        // The data endpoints and the browser-log intake are noisy/internal.
        if this.path.starts_with("/__tuono/data") || this.path.starts_with("/__tuono/logs") {
            return Poll::Ready(res);
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

        // The request duration is dimmed (secondary to the method/path/status).
        // `colored` auto-disables when output is not a TTY or `NO_COLOR` is set,
        // so production/json logs stay free of escape codes.
        let duration = format!("in {}ms", this.start.elapsed().as_millis()).dimmed();
        let method = colorize_method(this.method);

        log::backend(
            level,
            format!("{method} {} {} {duration}", this.path, status_code.as_u16()),
        );

        Poll::Ready(res)
    }
}
