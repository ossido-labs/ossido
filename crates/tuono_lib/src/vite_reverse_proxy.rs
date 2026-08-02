use std::collections::HashMap;
use std::sync::OnceLock;
use std::time::Instant;

use axum::body::Body;
use axum::extract::{Path, Query};
use axum::http::{HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use reqwest::Client;
use tuono_internal::log::{self, Level};

use crate::config::GLOBAL_CONFIG;

/// Under `DEBUG=1`, proxied vite requests faster than this are omitted from the
/// trace — they are cached serves, not plugin compilation (which takes far
/// longer). This keeps the debug output to the requests that did real work.
const VITE_TRACE_MIN_MS: u128 = 5;

/// Shared client so proxied requests reuse one connection pool (keep-alive to
/// the vite server) instead of building a fresh pool per request.
fn client() -> &'static Client {
    static CLIENT: OnceLock<Client> = OnceLock::new();
    CLIENT.get_or_init(Client::new)
}

pub async fn vite_reverse_proxy(
    Path(path): Path<String>,
    query: Query<HashMap<String, String>>,
) -> impl IntoResponse {
    // Time the proxied call: vite compiles the module/CSS on demand (tailwind and
    // every other plugin transform happens here), so this is where that cost is
    // observable to the Rust server.
    let started = Instant::now();

    let config = GLOBAL_CONFIG
        .get()
        .expect("Failed to get the internal config");

    let vite_url = format!(
        "http://{}:{}/vite-server",
        config.server.host,
        config.server.port + 1
    );

    let query_string = query
        .0
        .iter()
        .map(|(k, v)| format!("{k}={v}"))
        .collect::<Vec<_>>()
        .join("&");

    let query_string = if query_string.is_empty() {
        String::new()
    } else {
        format!("?{query_string}")
    };

    match client()
        .get(format!("{vite_url}/{path}{query_string}"))
        .send()
        .await
    {
        Ok(res) => {
            // The response headers arrive once vite has finished transforming, so
            // this captures the plugin compilation time (the body then streams).
            let elapsed = started.elapsed();
            if log::debug_enabled() && elapsed.as_millis() >= VITE_TRACE_MIN_MS {
                log::backend(
                    Level::Debug,
                    format!("vite ▸ {path} — {:.1}ms", elapsed.as_secs_f64() * 1000.0),
                );
            }

            let mut response_builder = Response::builder().status(res.status().as_u16());

            if let Some(headers) = response_builder.headers_mut() {
                res.headers().into_iter().for_each(|(name, value)| {
                    // Forward each header, skipping (rather than panicking on)
                    // any that don't convert cleanly between http crate versions.
                    if let (Ok(name), Ok(value)) = (
                        HeaderName::from_bytes(name.as_ref()),
                        HeaderValue::from_bytes(value.as_ref()),
                    ) {
                        headers.insert(name, value);
                    }
                });
            }

            response_builder
                .body(Body::from_stream(res.bytes_stream()))
                .unwrap_or_else(|_| StatusCode::BAD_GATEWAY.into_response())
        }
        // The vite dev server is unreachable (starting up, restarting, or
        // crashed): answer 502 so the browser retries, instead of panicking
        // the whole dev server.
        Err(err) => {
            log::backend(Level::Warn, format!("vite proxy failed for {path}: {err}"));
            StatusCode::BAD_GATEWAY.into_response()
        }
    }
}
