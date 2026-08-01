use std::collections::HashMap;
use std::sync::{OnceLock, RwLock};

use axum::body::Bytes;
use axum::extract::{Path, Request};
use axum::http::{StatusCode, header};
use axum::response::{Html, IntoResponse, Response};

use crate::Payload;
use crate::mode::{GLOBAL_MODE, Mode};

/// Fully-rendered HTML cached for data-less (`○` / static) routes.
///
/// Static routes have no server handler, so they fall through to `catch_all` and
/// their render depends only on the request URI — the payload is
/// `{ location, mode, js/cssBundles }`, all derived from the path (no headers,
/// no per-request data). That makes the output deterministic per URI and safe to
/// cache forever. Measured: this turns a heavy static route from ~1k req/s
/// (V8-bound, p99 81 ms) into the no-V8 ceiling (~30k req/s, p99 ~5 ms).
///
/// Prod only — a dev hot-reload rewrites the bundle, which would make entries
/// stale. Capped, because unmatched URLs (404s) also reach `catch_all`; once the
/// cap is hit we stop inserting so a garbage-URL flood can't grow memory without
/// bound (those paths simply re-render as before).
static STATIC_HTML_CACHE: OnceLock<RwLock<HashMap<String, Bytes>>> = OnceLock::new();
const STATIC_HTML_CACHE_CAP: usize = 4096;

fn cache() -> &'static RwLock<HashMap<String, Bytes>> {
    STATIC_HTML_CACHE.get_or_init(|| RwLock::new(HashMap::new()))
}

fn html_response(body: Bytes) -> Response {
    ([(header::CONTENT_TYPE, "text/html; charset=utf-8")], body).into_response()
}

pub async fn catch_all(Path(params): Path<HashMap<String, String>>, request: Request) -> Response {
    let is_prod = GLOBAL_MODE.get() == Some(&Mode::Prod);
    // Key on the full URI (path + query): `location.searchStr` is part of the
    // payload, so two queries can render differently.
    let key = request.uri().to_string();

    if is_prod
        && let Some(bytes) = cache()
            .read()
            .expect("static HTML cache poisoned")
            .get(&key)
    {
        return html_response(bytes.clone());
    }

    let pathname = request.uri();
    let headers = request.headers();

    let req = crate::Request::new(pathname.to_owned(), headers.to_owned(), params, None);

    // TODO: remove unwrap
    let payload = Payload::new(&req, &"").client_payload().unwrap();

    // Render on the dedicated pool so the async worker isn't blocked.
    match crate::render_pool::render(payload).await {
        Ok(html) => {
            let bytes = Bytes::from(html);
            if is_prod {
                let mut map = cache().write().expect("static HTML cache poisoned");
                // Bounded insert: once full, stop caching new entries (a 404 flood
                // can't grow memory unbounded); real static routes are few and get
                // cached on their first hit.
                if map.len() < STATIC_HTML_CACHE_CAP {
                    map.insert(key, bytes.clone());
                }
            }
            html_response(bytes)
        }
        _ => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Html("500 internal server error".to_string()),
        )
            .into_response(),
    }
}
