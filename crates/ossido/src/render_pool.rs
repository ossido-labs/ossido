//! Dedicated, bounded pool of OS threads for V8 SSR rendering.
//!
//! A V8 render is synchronous, CPU-bound, and has **no `await` points**, so
//! running it directly on a tokio worker monopolises that worker for the whole
//! render — starving async I/O (accepting connections, data-fetch awaits, the
//! vite proxy). That is catastrophic at low core counts: a lightweight request
//! that should take <1 ms can queue for 100s of ms behind heavy renders.
//!
//! This pool moves rendering onto its own fixed set of threads, each owning a
//! warm thread-local isolate (via [`Js::render_to_string`], which also handles
//! dev hot-reload per thread). The tokio runtime then stays free to service I/O
//! while renders proceed on the pool — the OS time-slices the render threads, so
//! I/O-bound requests are served promptly even on a single core.
//!
//! The pool size resolves in order: the `OSSIDO_SSR_THREADS` env var, then
//! `ssr.renderThreads` in `ossido.config.ts`, then the machine's available
//! parallelism (floored at 1 — lower it to cap memory on constrained hosts;
//! raising it past the core count only adds contention for CPU-bound rendering).
//! Isolate count equals the pool size — the same as the previous per-worker
//! model, so there is no memory increase.

use std::convert::Infallible;
use std::sync::OnceLock;

use axum::body::Body;
use crossbeam_channel::{Sender, unbounded};
use futures_util::stream::{self, StreamExt};
use ossido_ssr::SsrError;
use tokio::sync::{mpsc, oneshot};

use crate::ssr::Js;

/// A render request submitted to the pool. Buffered jobs return the whole page
/// over a oneshot; streaming jobs push each chunk (then a terminal result) over
/// an unbounded channel the async side drains into the HTTP response.
enum Job {
    Buffered(String, oneshot::Sender<Result<String, SsrError>>),
    Stream(String, mpsc::UnboundedSender<StreamMsg>),
}

/// A message on a streaming job's channel: one HTML chunk, or the terminal
/// render result (`Ok` once the page finishes, `Err` on a render failure).
enum StreamMsg {
    Chunk(String),
    Done(Result<(), SsrError>),
}

/// A [`StreamSink`](ossido_ssr::StreamSink) forwarding each chunk into a
/// streaming job's channel. Overriding `write_chunk_owned` moves the `String`
/// the V8 bridge already marshalled straight into the channel — no per-chunk
/// copy on the render thread.
struct ChannelSink(mpsc::UnboundedSender<StreamMsg>);

impl ossido_ssr::StreamSink for ChannelSink {
    fn write_chunk(&mut self, chunk: &str) {
        self.write_chunk_owned(chunk.to_string());
    }

    fn write_chunk_owned(&mut self, chunk: String) {
        // `send` only fails if the async side dropped the receiver (client
        // disconnected); rendering then simply completes unread.
        let _ = self.0.send(StreamMsg::Chunk(chunk));
    }
}

static POOL: OnceLock<Sender<Job>> = OnceLock::new();

/// Log a failed render so a 500 is never silent: the terminal shows *why*
/// (`SsrError::JsException` carries the stringified JS error/rejection). The
/// response itself stays a plain 500 — the error may contain source detail
/// that must not leak to clients in prod.
fn log_render_error(error: Option<&SsrError>) {
    if let Some(error) = error {
        ossido_internal::log::backend(
            ossido_internal::log::Level::Error,
            format!("SSR render failed: {error}"),
        );
    }
}

/// Run a render guarded against panics. Without this, one panicking render
/// (e.g. an isolate compiled from a torn mid-rebuild bundle read) kills the
/// pool thread; once every thread has died, all further requests fail
/// instantly with a bare 500 and no output — permanently, until restart. The
/// panic is logged, the thread's isolate is dropped (unwinding out of V8 can
/// leave it broken; the next render recompiles), and the request gets an
/// `Err` like any other failed render.
fn guarded<T>(
    render: impl FnOnce() -> Result<T, SsrError> + std::panic::UnwindSafe,
) -> Result<T, SsrError> {
    std::panic::catch_unwind(render).unwrap_or_else(|panic| {
        let msg = panic
            .downcast_ref::<&str>()
            .map(|s| s.to_string())
            .or_else(|| panic.downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "unknown panic".to_string());
        ossido_internal::log::backend(
            ossido_internal::log::Level::Error,
            format!("SSR render panicked: {msg}"),
        );
        Js::invalidate_isolate();
        Err(SsrError::FailedJsExecution("SSR render panicked"))
    })
}

const SSR_THREADS_ENV: &str = "OSSIDO_SSR_THREADS";
const SSR_WARMUP_ENV: &str = "OSSIDO_SSR_WARMUP_RENDERS";

/// Warm-up renders per pool thread before serving traffic. Repeated renders
/// let V8's tiering compilers (Sparkplug → Maglev → TurboFan) optimise the
/// bundle's hot render path — the first real requests then hit optimised code
/// instead of paying interpreter-speed renders (~4× slower in our benches).
/// Diminishing returns past a handful; renders are virtual-time so each costs
/// one page render, not wall-clock timer waits.
const DEFAULT_WARMUP_RENDERS: u32 = 3;

fn warmup_renders() -> u32 {
    // Resolution mirrors `pool_size()`: env var > config > default. `0` is
    // valid here (disable warm-up entirely).
    let from_env = std::env::var(SSR_WARMUP_ENV)
        .ok()
        .and_then(|value| value.parse::<u32>().ok());

    let from_config = crate::config::GLOBAL_CONFIG
        .get()
        .and_then(|config| config.ssr.warmup_renders);

    from_env.or(from_config).unwrap_or(DEFAULT_WARMUP_RENDERS)
}

fn pool_size() -> usize {
    // 1. `OSSIDO_SSR_THREADS` env var — a runtime escape hatch that wins.
    let from_env = std::env::var(SSR_THREADS_ENV)
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|&n| n >= 1);

    // 2. `ssr.renderThreads` from ossido.config.ts.
    let from_config = crate::config::GLOBAL_CONFIG
        .get()
        .and_then(|config| config.ssr.render_threads)
        .filter(|&n| n >= 1);

    // 3. Default: the machine's available parallelism.
    from_env.or(from_config).unwrap_or_else(|| {
        std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(1)
    })
}

fn sender() -> &'static Sender<Job> {
    POOL.get_or_init(|| {
        let (tx, rx) = unbounded::<Job>();
        let warmup = warmup_renders();
        for index in 0..pool_size() {
            let rx = rx.clone();
            std::thread::Builder::new()
                .name(format!("ossido-ssr-{index}"))
                .spawn(move || {
                    // Pre-warm: compile + cache this thread's isolate now (a
                    // throwaway render) so the first *real* request skips the
                    // bundle read + V8 compile — the dominant one-off SSR cost.
                    // Repeated warm-up renders (see `warmup_renders`) then let
                    // V8 tier the render path up to optimised code. A count of
                    // `0` skips warm-up entirely — the isolate then compiles
                    // lazily on this thread's first real request.
                    //
                    // Guarded by `catch_unwind` so a warm-up that can't complete
                    // (dev before the first build, or a missing prod bundle)
                    // leaves the thread alive to serve requests as before, rather
                    // than dying silently. In dev this is a no-op (the isolate
                    // compiles lazily once the bundle exists); in prod the bundle
                    // is present by the time the server starts.
                    if let Err(panic) = std::panic::catch_unwind(|| {
                        for _ in 0..warmup {
                            let _ = Js::render_to_string(None);
                        }
                    }) {
                        // Surface the panic instead of swallowing it: in prod a
                        // failed warm-up usually means a broken server bundle,
                        // and silence would just defer the error to the first
                        // real request.
                        let msg = panic
                            .downcast_ref::<&str>()
                            .map(|s| s.to_string())
                            .or_else(|| panic.downcast_ref::<String>().cloned())
                            .unwrap_or_else(|| "unknown panic".to_string());
                        ossido_internal::log::backend(
                            ossido_internal::log::Level::Warn,
                            format!("SSR warm-up render panicked: {msg}"),
                        );
                    }

                    // Each thread reuses its warm thread-local isolate for every
                    // job (recompiling only on a dev hot-reload, handled in `Js`).
                    while let Ok(job) = rx.recv() {
                        match job {
                            Job::Buffered(payload, reply) => {
                                let result = guarded(|| Js::render_to_string(Some(&payload)));
                                log_render_error(result.as_ref().err());
                                let _ = reply.send(result);
                            }
                            Job::Stream(payload, chunks) => {
                                // Forward each chunk as it is produced, then the
                                // terminal result. The sink owns a clone of the
                                // sender; the original stays for the terminal
                                // `Done`. `ChannelSink` takes each chunk as the
                                // owned `String` the V8 bridge marshalled, so
                                // nothing is re-copied on this thread.
                                let sink = ChannelSink(chunks.clone());
                                let result =
                                    guarded(|| Js::render_stream(Some(&payload), sink));
                                log_render_error(result.as_ref().err());
                                let _ = chunks.send(StreamMsg::Done(result));
                            }
                        }
                    }
                })
                .expect("failed to spawn ossido SSR render thread");
        }
        tx
    })
}

/// Spawn the render pool ahead of the first request (called at server start so
/// the threads — and their pre-warmed isolates — exist before load arrives).
/// Idempotent. Must run after `GLOBAL_MODE`/`GLOBAL_CONFIG` (and, in prod, the
/// manifest) are set, since the warm-up render reads them.
pub fn init() {
    let _ = sender();
}

/// Render `payload` on the SSR pool, awaiting the whole page **without blocking**
/// the calling tokio worker. Renders queue when every pool thread is busy.
pub async fn render(payload: String) -> Result<String, SsrError> {
    let (reply_tx, reply_rx) = oneshot::channel();

    if sender().send(Job::Buffered(payload, reply_tx)).is_err() {
        return Err(SsrError::FailedJsExecution(
            "SSR render pool is unavailable",
        ));
    }

    reply_rx.await.unwrap_or(Err(SsrError::FailedJsExecution(
        "SSR render task was dropped",
    )))
}

/// The outcome of starting a streaming render (see [`render_stream`]).
pub enum RenderStream {
    /// The shell rendered: a ready-to-return HTTP body that flushes each chunk
    /// as the pool thread produces it.
    Streaming(Body),
    /// The render completed without emitting any chunk (empty page).
    Empty,
    /// The shell failed (or the pool was unavailable) before any chunk — the
    /// caller should send an error response instead of a partial page.
    Failed,
}

/// Start a streaming render on the SSR pool. Returns once the shell is known
/// (first chunk or terminal result), so the caller can pick the HTTP status
/// before any bytes are sent, then hand [`RenderStream::Streaming`]'s body to
/// axum to flush the remaining chunks as they arrive.
///
/// The chunk channel is unbounded: the pool thread renders at full speed into
/// memory rather than blocking on a slow client — blocking would pin a render
/// thread on client I/O, reintroducing the worker starvation the pool exists to
/// avoid. A disconnected client just drops the receiver; the render completes
/// unread and the thread returns to the pool.
pub async fn render_stream(payload: String) -> RenderStream {
    let (chunk_tx, mut chunk_rx) = mpsc::unbounded_channel::<StreamMsg>();

    if sender().send(Job::Stream(payload, chunk_tx)).is_err() {
        return RenderStream::Failed;
    }

    // Wait for the first message so the status is decided before we stream:
    // a chunk means the shell is ready (commit to 200); a terminal result
    // first means the page emitted nothing (empty) or the shell errored.
    let first = match chunk_rx.recv().await {
        Some(StreamMsg::Chunk(chunk)) => chunk,
        Some(StreamMsg::Done(Ok(()))) => return RenderStream::Empty,
        Some(StreamMsg::Done(Err(_))) | None => return RenderStream::Failed,
    };

    // Yield the buffered first chunk, then drain the channel until the terminal
    // result. A mid-stream error ends the body (the client keeps the partial
    // page) — the status is already committed.
    //
    // `.fuse()` is required: `unfold` panics if polled after it returns `None`,
    // and some body consumers (e.g. `tower_http`'s `CompressionLayer`) poll once
    // more after completion to flush. Fusing makes the stream return `None`
    // indefinitely instead.
    let body = Body::from_stream(
        stream::unfold(
            (Some(first), chunk_rx),
            |(first, mut chunk_rx)| async move {
                if let Some(first) = first {
                    return Some((Ok::<String, Infallible>(first), (None, chunk_rx)));
                }
                match chunk_rx.recv().await {
                    Some(StreamMsg::Chunk(chunk)) => Some((Ok(chunk), (None, chunk_rx))),
                    Some(StreamMsg::Done(_)) | None => None,
                }
            },
        )
        .fuse(),
    );

    RenderStream::Streaming(body)
}
