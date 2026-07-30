use std::cell::RefCell;
use std::fs;
use std::time::SystemTime;

use ssr_rs::{Ssr, SsrError};

use crate::mode::{GLOBAL_MODE, Mode};

/// Server-side rendering entry point. Both modes cache a compiled bundle (a V8
/// isolate) per worker thread and reuse it across requests — creating a fresh
/// isolate and recompiling the whole bundle on every request is the dominant SSR
/// cost. Dev additionally rebuilds the isolate when the bundle file changes so
/// hot-reloads are still picked up.
///
/// Each phase (`bundle read` / `v8 compile` / `ssr render`) is timed into the
/// request trace under `DEBUG=1`, so a warm request shows only `ssr render`
/// while the first request (or the one after a rebuild) also shows the compile.
pub struct Js;

#[cfg(target_os = "windows")]
const PROD_BUNDLE_PATH: &str = ".\\out\\server\\prod-server.js";
#[cfg(target_os = "windows")]
const DEV_BUNDLE_PATH: &str = ".\\.tuono\\server\\dev-server.js";
#[cfg(target_os = "windows")]
const FALLBACK_HTML_PATH: &str = ".\\.tuono\\index.html";

#[cfg(not(target_os = "windows"))]
const PROD_BUNDLE_PATH: &str = "./out/server/prod-server.js";
#[cfg(not(target_os = "windows"))]
const DEV_BUNDLE_PATH: &str = "./.tuono/server/dev-server.js";
#[cfg(not(target_os = "windows"))]
const FALLBACK_HTML_PATH: &str = "./.tuono/index.html";

impl Js {
    pub fn render_to_string(payload: Option<&str>) -> Result<String, SsrError> {
        let mode = GLOBAL_MODE.get().expect("Failed to get GLOBAL_MODE");

        if *mode == Mode::Dev {
            DevJs::render_to_string(payload)
        } else {
            ProdJs::render_to_string(payload)
        }
    }
}

/// A compiled bundle (V8 isolate) cached on the current thread, tagged with the
/// bundle file's last-modified time so dev can tell when to rebuild it.
struct CachedSsr {
    modified: Option<SystemTime>,
    ssr: Ssr<'static, 'static>,
}

struct ProdJs;

impl ProdJs {
    thread_local! {
        static SSR: RefCell<Option<Ssr<'static, 'static>>> = const { RefCell::new(None) };
    }

    fn render_to_string(params: Option<&str>) -> Result<String, SsrError> {
        Self::SSR.with(|cell| {
            let mut cache = cell.borrow_mut();

            // Compiled once per worker thread, then reused for every request.
            if cache.is_none() {
                let source = crate::debug::time("bundle read", || {
                    fs::read_to_string(PROD_BUNDLE_PATH).expect("Server bundle not found")
                });
                let ssr = crate::debug::time("v8 compile", || {
                    Ssr::from(source, "").expect("Failed to initialise the SSR bundle")
                });
                *cache = Some(ssr);
            }

            let ssr = cache.as_mut().expect("SSR was just populated");
            crate::debug::time("ssr render", || ssr.render_to_string(params))
        })
    }
}

struct DevJs;

impl DevJs {
    thread_local! {
        static SSR: RefCell<Option<CachedSsr>> = const { RefCell::new(None) };
    }

    fn render_to_string(params: Option<&str>) -> Result<String, SsrError> {
        // Rebuild only when the bundle file changes (a hot-reload writes a new
        // `dev-server.js`); otherwise reuse the cached isolate.
        let modified = fs::metadata(DEV_BUNDLE_PATH)
            .and_then(|meta| meta.modified())
            .ok();

        Self::SSR.with(|cell| {
            let mut cache = cell.borrow_mut();

            let stale = match &*cache {
                Some(cached) => cached.modified != modified,
                None => true,
            };

            if stale {
                match Self::compile(modified) {
                    Some(cached) => *cache = Some(cached),
                    // Bundle missing or mid-rebuild: drop the cache and serve the
                    // raw HTML template so the client still boots (and the next
                    // request recompiles).
                    None => {
                        *cache = None;
                        return Ok(Self::fallback(params));
                    }
                }
            }

            let cached = cache.as_mut().expect("SSR was just populated");
            crate::debug::time("ssr render", || cached.ssr.render_to_string(params))
        })
    }

    /// Read + compile the dev bundle, or `None` if it can't be read/compiled.
    fn compile(modified: Option<SystemTime>) -> Option<CachedSsr> {
        let source =
            crate::debug::time("bundle read", || fs::read_to_string(DEV_BUNDLE_PATH).ok())?;
        let ssr = crate::debug::time("v8 compile", || Ssr::from(source, "").ok())?;
        Some(CachedSsr { modified, ssr })
    }

    fn fallback(params: Option<&str>) -> String {
        let fallback_html = fs::read_to_string(FALLBACK_HTML_PATH)
            .unwrap_or_else(|_| "Fallback HTML not loaded".to_string());
        fallback_html.replace("[SERVER_PAYLOAD]", params.unwrap_or(""))
    }
}
