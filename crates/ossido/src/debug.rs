//! Request-lifecycle debug tracing (enabled with `DEBUG=1`).
//!
//! When enabled, the [`LoggerLayer`](crate::services::logger) installs a
//! per-request [`RequestTimeline`] as a task-local value for the lifetime of the
//! request. Instrumented phases anywhere in the request (handler execution via
//! [`catch_handler`](crate::catch_handler), SSR render, …) record their timing
//! into it with [`time`]/[`time_async`], and the layer flushes the accumulated
//! waterfall when the request completes.
//!
//! Everything is a no-op (and allocation-free) when `DEBUG` is off: the timeline
//! is `None`, the timing helpers run their task without measuring, and nothing is
//! recorded or printed.

use std::future::Future;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use ossido_internal::log::{self, Level, TraceSpan};
use tokio::task::futures::TaskLocalFuture;
use tokio::task_local;

/// Accumulates the timed sub-tasks of a single request. Shared (via `Arc`) with
/// the task-local so concurrently-polled handlers on the request task can all
/// record into it.
#[derive(Default)]
pub struct RequestTimeline {
    spans: Vec<(String, Duration)>,
}

/// A handle to a request's timeline, or `None` when `DEBUG` is off.
pub type TimelineHandle = Option<Arc<Mutex<RequestTimeline>>>;

task_local! {
    static REQUEST_TIMELINE: TimelineHandle;
}

/// Create a timeline for a request when `DEBUG` is on, else `None`.
pub fn new_timeline() -> TimelineHandle {
    log::debug_enabled().then(|| Arc::new(Mutex::new(RequestTimeline::default())))
}

/// Run `fut` with `timeline` installed as the current request's timeline.
pub fn scope<F: Future>(timeline: TimelineHandle, fut: F) -> TaskLocalFuture<TimelineHandle, F> {
    REQUEST_TIMELINE.scope(timeline, fut)
}

fn record(label: &str, elapsed: Duration) {
    let _ = REQUEST_TIMELINE.try_with(|timeline| {
        if let Some(timeline) = timeline
            && let Ok(mut timeline) = timeline.lock()
        {
            timeline.spans.push((label.to_string(), elapsed));
        }
    });
}

/// Time a synchronous task and record it in the current request trace.
pub fn time<T>(label: &str, task: impl FnOnce() -> T) -> T {
    if !log::debug_enabled() {
        return task();
    }
    let start = Instant::now();
    let out = task();
    record(label, start.elapsed());
    out
}

/// Time an async task and record it in the current request trace.
pub async fn time_async<F: Future>(label: &str, task: F) -> F::Output {
    if !log::debug_enabled() {
        return task.await;
    }
    let start = Instant::now();
    let out = task.await;
    record(label, start.elapsed());
    out
}

/// Print the accumulated waterfall for a completed request. `header` summarises
/// the request (method/path/status/total); each recorded span is shown beneath.
pub fn flush(timeline: &Arc<Mutex<RequestTimeline>>, level: Level, header: &str, path: &str) {
    let Ok(timeline) = timeline.lock() else {
        return;
    };
    let spans: Vec<TraceSpan> = timeline
        .spans
        .iter()
        .map(|(label, elapsed)| TraceSpan {
            label: label.clone(),
            millis: elapsed.as_secs_f64() * 1000.0,
        })
        .collect();
    log::debug_trace(level, header, path, &spans);
}
