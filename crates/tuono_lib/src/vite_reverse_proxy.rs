use std::collections::HashMap;
use std::time::Instant;

use axum::body::Body;
use axum::extract::{Path, Query};
use axum::http::{HeaderName, HeaderValue};
use axum::response::{IntoResponse, Response};
use reqwest::Client;
use tuono_internal::log::{self, Level};

use crate::config::GLOBAL_CONFIG;

/// Under `DEBUG=1`, proxied vite requests faster than this are omitted from the
/// trace — they are cached serves, not plugin compilation (which takes far
/// longer). This keeps the debug output to the requests that did real work.
const VITE_TRACE_MIN_MS: u128 = 5;

pub async fn vite_reverse_proxy(
    Path(path): Path<String>,
    query: Query<HashMap<String, String>>,
) -> impl IntoResponse {
    // Time the proxied call: vite compiles the module/CSS on demand (tailwind and
    // every other plugin transform happens here), so this is where that cost is
    // observable to the Rust server.
    let started = Instant::now();
    let client = Client::new();

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

    match client
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

            {
                let headers = response_builder.headers_mut().unwrap();
                res.headers().into_iter().for_each(|(name, value)| {
                    let name = HeaderName::from_bytes(name.as_ref()).unwrap();
                    let value = HeaderValue::from_bytes(value.as_ref()).unwrap();
                    headers.insert(name, value);
                });
            }

            response_builder
                .body(Body::from_stream(res.bytes_stream()))
                .unwrap()
        }
        Err(_) => todo!(),
    }
}
