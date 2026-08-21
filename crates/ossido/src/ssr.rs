use std::cell::{Cell, RefCell};
use std::fs;
use std::hash::{DefaultHasher, Hash, Hasher};
use std::path::Path;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime};

use ossido_ssr::{Ssr, SsrError, StreamSink};

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

    /// Streaming render: `sink` receives each HTML fragment as it is produced
    /// (any [`StreamSink`], including a plain `FnMut(&str)` closure). Returns
    /// once the render's promise resolves; a *shell* error (rejection before
    /// any chunk) is an `Err` with the sink never invoked, so the caller can
    /// still send an error response instead of a partial page.
    pub fn render_stream(payload: Option<&str>, sink: impl StreamSink) -> Result<(), SsrError> {
        let mode = GLOBAL_MODE.get().expect("Failed to get GLOBAL_MODE");

        if *mode == Mode::Dev {
            DevJs::render_stream(payload, sink)
        } else {
            ProdJs::render_stream(payload, sink)
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

// V8 code cache (serialized Ignition bytecode), shared across render-pool
// threads: the first thread to compile the bundle produces it (an eager
// compile), and every other thread — plus any post-panic or hot-reload
// recompile — consumes it, skipping the parse+compile of the multi-MB bundle.

/// An in-process code-cache entry: the bundle file's mtime it was produced
/// from, plus the cache bytes (shared so consumers need no copy under the lock).
type CodeCacheEntry = (Option<SystemTime>, Arc<Vec<u8>>);

/// The in-process code cache for the current bundle, keyed by the bundle
/// file's mtime so a changed bundle (dev hot-reload, prod redeploy over a
/// running server) invalidates it.
static CODE_CACHE: Mutex<Option<CodeCacheEntry>> = Mutex::new(None);

/// Serialises the one "produce" compile: the first thread compiles while the
/// others block here, then find [`CODE_CACHE`] populated and consume it
/// instead of cold-compiling the bundle once per pool thread.
static PRODUCE_LOCK: Mutex<()> = Mutex::new(());

/// Prod's persisted code cache, so a restart with an unchanged bundle skips
/// even the first cold compile. Lives next to the other generated artifacts
/// under `.ossido` (never `out/`, which may be a read-only deploy artifact).
const DISK_CACHE_PATH: &str = "./.ossido/cache/prod-server.v8cache";
const DISK_CACHE_MAGIC: &[u8; 8] = b"OSSIDOV8";
/// magic + version tag (u32) + source len (u64) + source hash (u64).
const DISK_CACHE_HEADER_LEN: usize = 8 + 4 + 8 + 8;

/// The V8 cached-data version tag (V8 version + flags), latched on first use
/// so the whole process sees one consistent value — flags never change after
/// platform init, and latching also avoids a repeated FFI call per header
/// read/write.
static VERSION_TAG: OnceLock<u32> = OnceLock::new();

fn cached_data_version_tag() -> u32 {
    *VERSION_TAG.get_or_init(ossido_ssr::v8::script_compiler::cached_data_version_tag)
}

/// Disk persistence escape hatch: `OSSIDO_SSR_DISK_CACHE=0` disables it (the
/// in-process cache still works).
fn disk_cache_enabled() -> bool {
    std::env::var("OSSIDO_SSR_DISK_CACHE").map(|v| v != "0").unwrap_or(true)
}

/// Content fingerprint for the disk header. Hash stability across builds is
/// not required — a mismatch (or a `DefaultHasher` change across rustc
/// versions) just means one cold recompile. V8's own `rejected()` check is the
/// final backstop, but it only compares source *length*, so pairing the cache
/// with the exact source contents is on us (see `from_module_with_cache`).
fn source_fingerprint(source: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    source.hash(&mut hasher);
    hasher.finish()
}

/// Read the persisted cache, returning its payload only if the header matches
/// this V8 version/flags and this exact bundle source. Any mismatch or IO
/// error is a miss, never an error.
fn read_disk_cache(source: &str) -> Option<Vec<u8>> {
    read_disk_cache_at(Path::new(DISK_CACHE_PATH), source)
}

fn read_disk_cache_at(path: &Path, source: &str) -> Option<Vec<u8>> {
    let data = fs::read(path).ok()?;
    if data.len() < DISK_CACHE_HEADER_LEN || &data[0..8] != DISK_CACHE_MAGIC {
        return None;
    }
    let tag = u32::from_le_bytes(data[8..12].try_into().ok()?);
    if tag != cached_data_version_tag() {
        return None;
    }
    let len = u64::from_le_bytes(data[12..20].try_into().ok()?);
    if len != source.len() as u64 {
        return None;
    }
    let hash = u64::from_le_bytes(data[20..28].try_into().ok()?);
    if hash != source_fingerprint(source) {
        return None;
    }
    Some(data[DISK_CACHE_HEADER_LEN..].to_vec())
}

/// Best-effort persist (temp file + rename so a concurrent reader never sees a
/// torn file). Every failure is ignored: the next start just cold-compiles.
/// Takes the source length/fingerprint rather than the source itself because
/// the compile consumes the source string before the cache exists.
fn write_disk_cache(source_len: u64, fingerprint: u64, cache: &[u8]) {
    write_disk_cache_at(Path::new(DISK_CACHE_PATH), source_len, fingerprint, cache);
}

fn write_disk_cache_at(path: &Path, source_len: u64, fingerprint: u64, cache: &[u8]) {
    let Some(dir) = path.parent() else { return };
    if fs::create_dir_all(dir).is_err() {
        return;
    }
    let mut data = Vec::with_capacity(DISK_CACHE_HEADER_LEN + cache.len());
    data.extend_from_slice(DISK_CACHE_MAGIC);
    data.extend_from_slice(&cached_data_version_tag().to_le_bytes());
    data.extend_from_slice(&source_len.to_le_bytes());
    data.extend_from_slice(&fingerprint.to_le_bytes());
    data.extend_from_slice(cache);
    let tmp = path.with_extension("v8cache.tmp");
    if fs::write(&tmp, &data).is_ok() && fs::rename(&tmp, path).is_err() {
        let _ = fs::remove_file(&tmp);
    }
}

/// The in-process cache's bytes, if they belong to the bundle stamped `modified`.
fn shared_cache_for(modified: Option<SystemTime>) -> Option<Arc<Vec<u8>>> {
    let cache = CODE_CACHE.lock().expect("SSR code cache lock poisoned");
    cache
        .as_ref()
        .filter(|(key, _)| *key == modified)
        .map(|(_, bytes)| Arc::clone(bytes))
}

/// Log + forget a cache V8 rejected, deleting prod's disk copy too. The
/// isolate compiled from source is still valid — only the cache is dropped, so
/// the next cold compile regenerates it.
fn discard_rejected_cache(disk: bool) {
    ossido_internal::log::backend(
        ossido_internal::log::Level::Warn,
        "SSR code cache was rejected by V8 (stale or corrupt); recompiled from source".to_string(),
    );
    *CODE_CACHE.lock().expect("SSR code cache lock poisoned") = None;
    if disk {
        let _ = fs::remove_file(DISK_CACHE_PATH);
    }
}

/// Compile `source` through the shared code cache: consume the in-process
/// cache when it matches `modified` (falling back to prod's disk cache when
/// `disk`), otherwise eagerly produce it under [`PRODUCE_LOCK`] so exactly one
/// thread pays the cold compile.
fn compile_with_shared_cache(
    source: String,
    modified: Option<SystemTime>,
    disk: bool,
) -> Result<Ssr<'static, 'static>, SsrError> {
    // 1. In-process cache from another pool thread (or an earlier compile).
    if let Some(bytes) = shared_cache_for(modified) {
        let build = Ssr::from_module_with_cache(source, Some(&bytes))?;
        if build.cache_rejected {
            discard_rejected_cache(disk);
        }
        return Ok(build.ssr);
    }

    // 2. Prod: a cache persisted by a previous run of this exact bundle.
    if disk
        && disk_cache_enabled()
        && let Some(bytes) = read_disk_cache(&source)
    {
        let bytes = Arc::new(bytes);
        let build = Ssr::from_module_with_cache(source, Some(&bytes))?;
        if build.cache_rejected {
            discard_rejected_cache(disk);
        } else {
            *CODE_CACHE.lock().expect("SSR code cache lock poisoned") = Some((modified, bytes));
        }
        return Ok(build.ssr);
    }

    // 3. Cold: one thread produces (eager compile + cache serialization) while
    //    the others block on the lock, then consume via the double-check.
    let _guard = PRODUCE_LOCK.lock().expect("SSR produce lock poisoned");
    if let Some(bytes) = shared_cache_for(modified) {
        let build = Ssr::from_module_with_cache(source, Some(&bytes))?;
        if build.cache_rejected {
            discard_rejected_cache(disk);
        }
        return Ok(build.ssr);
    }

    // The produce call consumes `source`; hash it first for the disk header.
    let header = (disk && disk_cache_enabled())
        .then(|| (source.len() as u64, source_fingerprint(&source)));
    let build = Ssr::from_module_with_cache(source, None)?;
    if let Some(produced) = build.produced_cache {
        if let Some((source_len, fingerprint)) = header {
            write_disk_cache(source_len, fingerprint, &produced);
        }
        *CODE_CACHE.lock().expect("SSR code cache lock poisoned") =
            Some((modified, Arc::new(produced)));
    }
    Ok(build.ssr)
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
            // The first thread eagerly compiles and shares the V8 code cache;
            // the others (and post-panic recompiles) consume it. A cache
            // persisted by a previous run of this bundle skips even that.
            if cache.is_none() {
                let source = crate::debug::time("bundle read", || {
                    fs::read_to_string(PROD_BUNDLE_PATH).expect("Server bundle not found")
                });
                let modified = fs::metadata(PROD_BUNDLE_PATH)
                    .and_then(|meta| meta.modified())
                    .ok();
                let ssr = crate::debug::time("v8 compile", || {
                    compile_with_shared_cache(source, modified, true)
                        .expect("Failed to initialise the SSR bundle")
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

    fn render_stream(params: Option<&str>, mut sink: impl StreamSink) -> Result<(), SsrError> {
        Self::with_ssr(move |ssr| {
            crate::debug::time("ssr render", || {
                // Lend the sink to the render; `ossido_ssr` borrows it for the call.
                ssr.streaming(STREAM_WRITE_FN)?
                    .render(RENDER_STREAM_FN, params, &mut sink)
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

    fn render_stream(params: Option<&str>, mut sink: impl StreamSink) -> Result<(), SsrError> {
        let result = Self::with_ssr(move |ssr| match ssr {
            Some(ssr) => crate::debug::time("ssr render", || {
                // Lend the sink to the render; `ossido_ssr` borrows it for the call.
                ssr.streaming(STREAM_WRITE_FN)?
                    .render(RENDER_STREAM_FN, params, &mut sink)
            }),
            // Emit the fallback shell as a single chunk so the streaming path
            // still boots the client while the bundle is (re)building.
            None => {
                sink.write_chunk_owned(Self::fallback(params));
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

        // Threads 2..N (and post-panic recompiles) consume the code cache the
        // first thread to compile this bundle version produced. Dev never
        // touches the disk cache — the bundle churns on every edit.
        let ssr = crate::debug::time("v8 compile", || {
            compile_with_shared_cache(source, modified, false).ok()
        })?;
        Some(CachedSsr { modified, ssr })
    }

    fn fallback(params: Option<&str>) -> String {
        let fallback_html = fs::read_to_string(FALLBACK_HTML_PATH)
            .unwrap_or_else(|_| "Fallback HTML not loaded".to_string());
        fallback_html.replace("[SERVER_PAYLOAD]", params.unwrap_or(""))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Round-trip: a persisted cache is returned only for the exact source it
    /// was written for.
    #[test]
    fn disk_cache_round_trips_for_matching_source() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cache").join("bundle.v8cache");
        let source = "export function renderFn() { return 'x'; }";
        let payload = vec![7u8; 64];

        write_disk_cache_at(
            &path,
            source.len() as u64,
            source_fingerprint(source),
            &payload,
        );

        assert_eq!(read_disk_cache_at(&path, source), Some(payload));
    }

    /// Same length, different contents: the fingerprint must miss. (V8's own
    /// sanity check only compares source length, so this header check is what
    /// prevents running stale cached code.)
    #[test]
    fn disk_cache_misses_for_same_length_different_source() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("bundle.v8cache");
        let source_a = "export function renderFn() { return 'a'; }";
        let source_b = "export function renderFn() { return 'b'; }";
        assert_eq!(source_a.len(), source_b.len());

        write_disk_cache_at(
            &path,
            source_a.len() as u64,
            source_fingerprint(source_a),
            &[1, 2, 3],
        );

        assert_eq!(read_disk_cache_at(&path, source_b), None);
        // The original source still hits.
        assert_eq!(read_disk_cache_at(&path, source_a), Some(vec![1, 2, 3]));
    }

    /// Garbage or truncated files are a miss, never an error.
    #[test]
    fn disk_cache_ignores_corrupt_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("bundle.v8cache");

        fs::write(&path, b"not a cache").unwrap();
        assert_eq!(read_disk_cache_at(&path, "whatever"), None);

        fs::write(&path, b"OSSIDOV8").unwrap(); // magic only, truncated header
        assert_eq!(read_disk_cache_at(&path, "whatever"), None);
    }

    /// A missing file is a plain miss.
    #[test]
    fn disk_cache_misses_when_absent() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(
            read_disk_cache_at(&dir.path().join("nope.v8cache"), "src"),
            None
        );
    }
}
