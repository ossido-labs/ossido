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
//! The pool size resolves in order: the `TUONO_SSR_THREADS` env var, then
//! `ssr.renderThreads` in `tuono.config.ts`, then the machine's available
//! parallelism (floored at 1 — lower it to cap memory on constrained hosts;
//! raising it past the core count only adds contention for CPU-bound rendering).
//! Isolate count equals the pool size — the same as the previous per-worker
//! model, so there is no memory increase.

use std::convert::Infallible;
use std::sync::OnceLock;

use axum::body::Body;
use crossbeam_channel::{Sender, unbounded};
use futures_util::stream::{self, StreamExt};
use ssr_rs::SsrError;
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

static POOL: OnceLock<Sender<Job>> = OnceLock::new();

const SSR_THREADS_ENV: &str = "TUONO_SSR_THREADS";

fn pool_size() -> usize {
    // 1. `TUONO_SSR_THREADS` env var — a runtime escape hatch that wins.
    let from_env = std::env::var(SSR_THREADS_ENV)
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|&n| n >= 1);

    // 2. `ssr.renderThreads` from tuono.config.ts.
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
        for index in 0..pool_size() {
            let rx = rx.clone();
            std::thread::Builder::new()
                .name(format!("tuono-ssr-{index}"))
                .spawn(move || {
                    // Pre-warm: compile + cache this thread's isolate now (a
                    // throwaway render) so the first *real* request skips the
                    // bundle read + V8 compile — the dominant one-off SSR cost.
                    //
                    // Guarded by `catch_unwind` so a warm-up that can't complete
                    // (dev before the first build, or a missing prod bundle)
                    // leaves the thread alive to serve requests as before, rather
                    // than dying silently. In dev this is a no-op (the isolate
                    // compiles lazily once the bundle exists); in prod the bundle
                    // is present by the time the server starts.
                    let _ = std::panic::catch_unwind(|| {
                        let _ = Js::render_to_string(None);
                    });

                    // Each thread reuses its warm thread-local isolate for every
                    // job (recompiling only on a dev hot-reload, handled in `Js`).
                    while let Ok(job) = rx.recv() {
                        match job {
                            Job::Buffered(payload, reply) => {
                                let _ = reply.send(Js::render_to_string(Some(&payload)));
                            }
                            Job::Stream(payload, chunks) => {
                                // Forward each chunk as it is produced, then the
                                // terminal result. `send` only fails if the async
                                // side dropped the receiver (client disconnected),
                                // in which case rendering simply completes unread.
                                // The sink owns a clone of the sender (the render
                                // sink is `'static`); the original stays for the
                                // terminal `Done`.
                                let tx = chunks.clone();
                                let result = Js::render_stream(Some(&payload), move |chunk| {
                                    let _ = tx.send(StreamMsg::Chunk(chunk));
                                });
                                let _ = chunks.send(StreamMsg::Done(result));
                            }
                        }
                    }
                })
                .expect("failed to spawn tuono SSR render thread");
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
