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
//! The pool size defaults to the machine's available parallelism, overridable
//! via `TUONO_SSR_THREADS` (floored at 1 — lower it to cap memory on
//! constrained hosts; raising it past the core count only adds contention for
//! CPU-bound rendering). Isolate count equals the pool size — the same as the
//! previous per-worker model, so there is no memory increase.

use std::sync::OnceLock;

use crossbeam_channel::{Sender, unbounded};
use ssr_rs::SsrError;
use tokio::sync::oneshot;

use crate::ssr::Js;

/// A render request: the payload plus a channel to return the rendered HTML.
type Job = (String, oneshot::Sender<Result<String, SsrError>>);

static POOL: OnceLock<Sender<Job>> = OnceLock::new();

const SSR_THREADS_ENV: &str = "TUONO_SSR_THREADS";

fn pool_size() -> usize {
    std::env::var(SSR_THREADS_ENV)
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|&n| n >= 1)
        .unwrap_or_else(|| {
            std::thread::available_parallelism()
                .map(|n| n.get())
                .unwrap_or(1)
        })
        .max(1)
}

fn sender() -> &'static Sender<Job> {
    POOL.get_or_init(|| {
        let (tx, rx) = unbounded::<Job>();
        for index in 0..pool_size() {
            let rx = rx.clone();
            std::thread::Builder::new()
                .name(format!("tuono-ssr-{index}"))
                .spawn(move || {
                    // Each thread compiles + caches its own isolate on first
                    // render (thread-local inside `Js`) and reuses it thereafter.
                    while let Ok((payload, reply)) = rx.recv() {
                        let _ = reply.send(Js::render_to_string(Some(&payload)));
                    }
                })
                .expect("failed to spawn tuono SSR render thread");
        }
        tx
    })
}

/// Spawn the render pool ahead of the first request (called at server start so
/// the threads exist before load arrives). Idempotent.
pub fn init() {
    let _ = sender();
}

/// Render `payload` on the SSR pool, awaiting the result **without blocking** the
/// calling tokio worker. Renders queue when every pool thread is busy.
pub async fn render(payload: String) -> Result<String, SsrError> {
    let (reply_tx, reply_rx) = oneshot::channel();

    if sender().send((payload, reply_tx)).is_err() {
        return Err(SsrError::FailedJsExecution(
            "SSR render pool is unavailable",
        ));
    }

    reply_rx.await.unwrap_or(Err(SsrError::FailedJsExecution(
        "SSR render task was dropped",
    )))
}
