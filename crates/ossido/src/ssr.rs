use std::cell::{Cell, RefCell};
use std::fs;
use std::time::{Duration, Instant, SystemTime};

use ossido_ssr::{Ssr, SsrError};

use crate::mode::{GLOBAL_MODE, Mode};

/// Server-side rendering entry point. Both modes cache a compiled bundle (a V8
/// isolate) per worker thread and reuse it across requests — creating a fresh
/// isolate and recompiling the whole bundle on every request is the dominant SSR
/// cost. Dev additionally rebuilds the isolate when the bundle file changes so
/// hot-reloads are still picked up.
///
/// The bundle exposes two named exports (see `templates/server.ts`):
/// `renderFn` buffers the whole page into a string, while `renderStream` flushes
/// each HTML chunk through the `__ssr_write` global as React produces it.
/// [`Js::render_to_string`] drives the former; [`Js::render_stream`] the latter.
///
/// Streaming is `ossido_ssr`'s opt-in [`Ssr::streaming`] helper: it installs the
/// `__ssr_write` writer global and drives the render, delivering each chunk to
/// the sink ossido passes (see [`Js::render_stream`]). ossido owns the sink and
/// only *lends* it to the render — `Streaming::render` borrows it as
/// `&mut dyn StreamSink` for the duration of the call rather than taking
/// ownership, so the sink can hold borrowed local state and need not be `'static`.
///
/// Each phase (`bundle read` / `v8 compile` / `ssr render`) is timed into the
/// request trace under `DEBUG=1`, so a warm request shows only `ssr render`
/// while the first request (or the one after a rebuild) also shows the compile.
pub struct Js;

/// Buffered-render export: resolves the whole page to a single string.
const RENDER_FN: &str = "renderFn";
/// Streaming-render export: writes chunks via the `__ssr_write` global.
const RENDER_STREAM_FN: &str = "renderStream";
/// The writer global the streaming bundle calls to emit each chunk.
const STREAM_WRITE_FN: &str = "__ssr_write";

#[cfg(target_os = "windows")]
const PROD_BUNDLE_PATH: &str = ".\\out\\server\\prod-server.js";
#[cfg(target_os = "windows")]
const DEV_BUNDLE_PATH: &str = ".\\.ossido\\server\\dev-server.js";
#[cfg(target_os = "windows")]
const FALLBACK_HTML_PATH: &str = ".\\.ossido\\index.html";

#[cfg(not(target_os = "windows"))]
const PROD_BUNDLE_PATH: &str = "./out/server/prod-server.js";
#[cfg(not(target_os = "windows"))]
const DEV_BUNDLE_PATH: &str = "./.ossido/server/dev-server.js";
#[cfg(not(target_os = "windows"))]
const FALLBACK_HTML_PATH: &str = "./.ossido/index.html";

impl Js {
    pub fn render_to_string(payload: Option<&str>) -> Result<String, SsrError> {
        let mode = GLOBAL_MODE.get().expect("Failed to get GLOBAL_MODE");

        if *mode == Mode::Dev {
            DevJs::render_to_string(payload)
        } else {
            ProdJs::render_to_string(payload)
        }
    }

    /// Streaming render: `on_chunk` is invoked for each HTML fragment as it is
    /// produced. Returns once the render's promise resolves; a *shell* error
    /// (rejection before any chunk) is an `Err` with `on_chunk` never called, so
    /// the caller can still send an error response instead of a partial page.
    pub fn render_stream(
        payload: Option<&str>,
        on_chunk: impl FnMut(&str),
    ) -> Result<(), SsrError> {
        let mode = GLOBAL_MODE.get().expect("Failed to get GLOBAL_MODE");

        if *mode == Mode::Dev {
            DevJs::render_stream(payload, on_chunk)
        } else {
            ProdJs::render_stream(payload, on_chunk)
        }
    }

    /// Drop the current thread's cached isolate so the next render recompiles
    /// from the bundle on disk. Called by the render pool after a render
    /// *panics*: unwinding out of V8 can leave the isolate in a broken state,
    /// and reusing it would fail every subsequent request on this thread.
    pub fn invalidate_isolate() {
        let mode = GLOBAL_MODE.get().expect("Failed to get GLOBAL_MODE");

        if *mode == Mode::Dev {
            DevJs::invalidate();
        } else {
            ProdJs::invalidate();
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

    /// Run `f` against this thread's cached isolate, compiling + caching it on
    /// first use. The prod bundle is always present by server start, so a failed
    /// read/compile panics (as before) rather than falling back.
    fn with_ssr<R>(f: impl FnOnce(&mut Ssr<'static, 'static>) -> R) -> R {
        Self::SSR.with(|cell| {
            let mut cache = cell.borrow_mut();

            // Compiled once per worker thread, then reused for every request.
            if cache.is_none() {
                let source = crate::debug::time("bundle read", || {
                    fs::read_to_string(PROD_BUNDLE_PATH).expect("Server bundle not found")
                });
                let ssr = crate::debug::time("v8 compile", || {
                    Ssr::from_module(source).expect("Failed to initialise the SSR bundle")
                });
                *cache = Some(ssr);
            }

            let ssr = cache.as_mut().expect("SSR was just populated");
            f(ssr)
        })
    }

    fn render_to_string(params: Option<&str>) -> Result<String, SsrError> {
        Self::with_ssr(|ssr| crate::debug::time("ssr render", || ssr.render(RENDER_FN, params)))
    }

    fn render_stream(
        params: Option<&str>,
        mut on_chunk: impl FnMut(&str),
    ) -> Result<(), SsrError> {
        Self::with_ssr(move |ssr| {
            crate::debug::time("ssr render", || {
                // Lend the sink to the render; `ossido_ssr` borrows it for the call.
                ssr.streaming(STREAM_WRITE_FN)?
                    .render(RENDER_STREAM_FN, params, &mut on_chunk)
            })
        })
    }

    /// Drop this thread's cached isolate; the next render recompiles the prod
    /// bundle. See [`Js::invalidate_isolate`].
    fn invalidate() {
        Self::SSR.with(|cell| *cell.borrow_mut() = None);
    }
}

struct DevJs;

/// How long a thread trusts its cached isolate before re-`stat`ing the bundle to
/// detect a hot-reload. A rebuild is picked up within this window; between checks
/// we skip the per-request `stat` syscall. A dev vite rebuild takes far longer
/// than this, so the added staleness is imperceptible.
const BUNDLE_CHECK_DEBOUNCE: Duration = Duration::from_millis(250);

impl DevJs {
    thread_local! {
        static SSR: RefCell<Option<CachedSsr>> = const { RefCell::new(None) };
        static LAST_CHECK: Cell<Option<Instant>> = const { Cell::new(None) };
    }

    /// Run `f` against this thread's cached isolate, rebuilding it when the dev
    /// bundle changes (debounced). `f` receives `None` when the bundle is missing
    /// or mid-rebuild, so each caller can serve its own fallback; the closure is
    /// invoked exactly once so a streaming sink can be captured without conflict.
    fn with_ssr<R>(f: impl FnOnce(Option<&mut Ssr<'static, 'static>>) -> R) -> R {
        Self::SSR.with(|cell| {
            let mut cache = cell.borrow_mut();

            // Debounce the mtime check: within the window, reuse the cached
            // isolate without a `stat`. A fresh thread (no cache) always checks.
            let now = Instant::now();
            let due = match Self::LAST_CHECK.with(|c| c.get()) {
                Some(last) => now.duration_since(last) >= BUNDLE_CHECK_DEBOUNCE,
                None => true,
            };

            if cache.is_some() && !due {
                let cached = cache.as_mut().expect("cache is Some");
                return f(Some(&mut cached.ssr));
            }

            Self::LAST_CHECK.with(|c| c.set(Some(now)));

            // Rebuild only when the bundle file changes (a hot-reload writes a
            // new `dev-server.js`); otherwise reuse the cached isolate.
            let modified = fs::metadata(DEV_BUNDLE_PATH)
                .and_then(|meta| meta.modified())
                .ok();

            let stale = match &*cache {
                Some(cached) => cached.modified != modified,
                None => true,
            };

            if stale {
                // Drop the old isolate BEFORE compiling the new one: rusty_v8
                // requires `OwnedIsolate`s to be dropped in reverse creation
                // order, so replacing the cache in one step (new isolate created
                // while the old is still alive) panics on the old one's drop —
                // which, unguarded, killed this pool thread on every hot-reload
                // recompile.
                *cache = None;

                match Self::compile(modified) {
                    Some(cached) => *cache = Some(cached),
                    // Bundle missing or mid-rebuild: leave the cache empty and
                    // let the caller serve the raw HTML template so the client
                    // still boots (the next request recompiles).
                    None => return f(None),
                }
            }

            let cached = cache.as_mut().expect("SSR was just populated");
            f(Some(&mut cached.ssr))
        })
    }

    fn render_to_string(params: Option<&str>) -> Result<String, SsrError> {
        let result = Self::with_ssr(|ssr| match ssr {
            Some(ssr) => crate::debug::time("ssr render", || ssr.render(RENDER_FN, params)),
            None => Ok(Self::fallback(params)),
        });
        if result.is_err() {
            Self::invalidate();
        }
        result
    }

    fn render_stream(
        params: Option<&str>,
        mut on_chunk: impl FnMut(&str),
    ) -> Result<(), SsrError> {
        let result = Self::with_ssr(move |ssr| match ssr {
            Some(ssr) => crate::debug::time("ssr render", || {
                // Lend the sink to the render; `ossido_ssr` borrows it for the call.
                ssr.streaming(STREAM_WRITE_FN)?
                    .render(RENDER_STREAM_FN, params, &mut on_chunk)
            }),
            // Emit the fallback shell as a single chunk so the streaming path
            // still boots the client while the bundle is (re)building.
            None => {
                on_chunk(&Self::fallback(params));
                Ok(())
            }
        });
        if result.is_err() {
            Self::invalidate();
        }
        result
    }

    /// Drop this thread's cached isolate so the next request recompiles from
    /// the bundle on disk. Called after any failed render: a failure can mean
    /// the isolate is poisoned (compiled from a torn mid-rebuild read, or V8
    /// left in a broken state), and keeping it would fail every subsequent
    /// request on this thread until the next edit changed the bundle's mtime.
    /// Also clears the debounce so the recompile isn't deferred.
    fn invalidate() {
        Self::SSR.with(|cell| *cell.borrow_mut() = None);
        Self::LAST_CHECK.with(|c| c.set(None));
    }

    /// Read + compile the dev bundle, or `None` if it can't be read/compiled.
    fn compile(modified: Option<SystemTime>) -> Option<CachedSsr> {
        let source =
            crate::debug::time("bundle read", || fs::read_to_string(DEV_BUNDLE_PATH).ok())?;

        // The bundle write is not atomic: a hot-reload can overwrite the file
        // mid-read, yielding truncated JS that may still compile yet render
        // broken — and, with the pre-write mtime cached, it would keep failing
        // until the next edit. If the mtime moved during the read, discard it;
        // the caller serves the fallback and the next request retries.
        let modified_after_read = fs::metadata(DEV_BUNDLE_PATH)
            .and_then(|meta| meta.modified())
            .ok();
        if modified_after_read != modified {
            return None;
        }

        let ssr = crate::debug::time("v8 compile", || Ssr::from_module(source).ok())?;
        Some(CachedSsr { modified, ssr })
    }

    fn fallback(params: Option<&str>) -> String {
        let fallback_html = fs::read_to_string(FALLBACK_HTML_PATH)
            .unwrap_or_else(|_| "Fallback HTML not loaded".to_string());
        fallback_html.replace("[SERVER_PAYLOAD]", params.unwrap_or(""))
    }
}
