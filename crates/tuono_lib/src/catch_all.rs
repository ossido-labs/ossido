use std::collections::HashMap;
use std::io::Write;
use std::sync::{OnceLock, RwLock};

use axum::body::Bytes;
use axum::extract::{Path, Request};
use axum::http::{HeaderMap, StatusCode, header};
use axum::response::{Html, IntoResponse, Response};

use crate::Payload;
use crate::mode::{GLOBAL_MODE, Mode};

/// A rendered static page held in the cache: the raw HTML plus its brotli-
/// compressed form, so a `br`-capable client is served the compressed bytes with
/// zero per-request compression work.
struct CachedPage {
    raw: Bytes,
    br: Bytes,
}

/// Fully-rendered HTML cached for data-less (`○` / static) routes.
///
/// Static routes have no server handler, so they fall through to `catch_all` and
/// their render depends only on the request URI — the payload is
/// `{ location, mode, js/cssBundles }`, all derived from the path (no headers,
/// no per-request data). That makes the output deterministic per URI and safe to
/// cache forever. Each entry is compressed **once** on insert, so serving a hot
/// static route costs no V8 render and no compression — just an `Arc` clone.
///
/// Prod only — a dev hot-reload rewrites the bundle, which would make entries
/// stale. Capped, because unmatched URLs (404s) also reach `catch_all`; once the
/// cap is hit we stop inserting so a garbage-URL flood can't grow memory without
/// bound (those paths simply re-render as before).
static STATIC_HTML_CACHE: OnceLock<RwLock<HashMap<String, CachedPage>>> = OnceLock::new();
const STATIC_HTML_CACHE_CAP: usize = 4096;

fn cache() -> &'static RwLock<HashMap<String, CachedPage>> {
    STATIC_HTML_CACHE.get_or_init(|| RwLock::new(HashMap::new()))
}

/// Whether the client advertised support for brotli in `Accept-Encoding`.
fn accepts_brotli(headers: &HeaderMap) -> bool {
    headers
        .get(header::ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.split(',').any(|enc| enc.trim().starts_with("br")))
}

/// Compress `input` with brotli. Quality 9 is a strong ratio at reasonable speed
/// — and it runs once per static route (on the first request), then is reused.
fn brotli(input: &[u8]) -> Bytes {
    let mut out = Vec::new();
    {
        let mut writer = brotli::CompressorWriter::new(&mut out, 4096, 9, 22);
        // Writing to a `Vec` is infallible.
        let _ = writer.write_all(input);
        let _ = writer.flush();
    }
    Bytes::from(out)
}

fn html_response(body: Bytes) -> Response {
    ([(header::CONTENT_TYPE, "text/html; charset=utf-8")], body).into_response()
}

/// A pre-compressed brotli response. `Content-Encoding: br` tells the outer
/// `CompressionLayer` this body is already encoded, so it is passed through
/// untouched rather than re-compressed.
fn html_br_response(body: Bytes) -> Response {
    (
        [
            (header::CONTENT_TYPE, "text/html; charset=utf-8"),
            (header::CONTENT_ENCODING, "br"),
        ],
        body,
    )
        .into_response()
}

pub async fn catch_all(Path(params): Path<HashMap<String, String>>, request: Request) -> Response {
    let is_prod = GLOBAL_MODE.get() == Some(&Mode::Prod);
    let br = accepts_brotli(request.headers());

    // Cache key = the full URI (path + query): `location.searchStr` is part of the
    // payload, so different queries can render differently. Borrow it for the
    // lookup so a cache hit allocates nothing; only owning it on insert (miss).
    let key = request
        .uri()
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or_else(|| request.uri().path());

    if is_prod && let Some(page) = cache().read().expect("static HTML cache poisoned").get(key) {
        return if br {
            html_br_response(page.br.clone())
        } else {
            // Uncompressed: the outer `CompressionLayer` may still gzip it for a
            // gzip-only client.
            html_response(page.raw.clone())
        };
    }

    let pathname = request.uri();
    let headers = request.headers();

    let req = crate::Request::new(pathname.to_owned(), headers.to_owned(), params, None);

    // Serializing the static payload (no route data) can only fail on a broken
    // manifest lookup; degrade to a 500 rather than panicking the worker.
    let Ok(payload) = Payload::new(&req, &"").client_payload() else {
        return internal_server_error();
    };

    // Render on the dedicated pool so the async worker isn't blocked.
    match crate::render_pool::render(payload).await {
        Ok(html) => {
            let raw = Bytes::from(html);
            let compressed = brotli(&raw);
            if is_prod {
                let mut map = cache().write().expect("static HTML cache poisoned");
                // Bounded insert: once full, stop caching new entries (a 404 flood
                // can't grow memory unbounded); real static routes are few and get
                // cached on their first hit.
                if map.len() < STATIC_HTML_CACHE_CAP {
                    map.insert(
                        key.to_string(),
                        CachedPage {
                            raw: raw.clone(),
                            br: compressed.clone(),
                        },
                    );
                }
            }
            if br {
                html_br_response(compressed)
            } else {
                html_response(raw)
            }
        }
        _ => internal_server_error(),
    }
}

fn internal_server_error() -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Html(crate::response::INTERNAL_SERVER_ERROR_HTML.to_string()),
    )
        .into_response()
}
