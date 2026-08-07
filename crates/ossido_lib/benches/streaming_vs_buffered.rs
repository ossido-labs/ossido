//! Benchmark: streaming SSR (`Ssr::streaming`) vs buffered full-string SSR
//! (`Ssr::render`) — the two ssr_rs render paths ossido uses. Benchmarking at the
//! `Ssr` boundary isolates the difference that matters; the ossido render-pool
//! layer is identical plumbing on top of both.
//!
//! Run with:
//!   cargo bench -p ossido_lib --bench streaming_vs_buffered
//!
//! Both paths drive the same V8 render of the same document; they differ only
//! in how the HTML crosses the V8 → Rust boundary:
//!   * buffered — the whole document is marshalled into one `String`.
//!   * streaming (drained) — marshalled chunk-by-chunk into a callback that
//!     forwards and drops each chunk (best case: O(chunk) live).
//!   * streaming (collected) — chunks reassembled into one `String` (worst
//!     case, e.g. a fully-buffered channel: O(document) live).
//!
//! Memory: the `#[global_allocator]` below tracks only *Rust-side* heap. V8's
//! internal render allocations go through V8's own C++ allocator and are
//! invisible here — which is exactly what we want, because they are identical
//! for both paths. The reported peak therefore isolates the marshalling /
//! buffering cost, which is where streaming and buffering genuinely diverge.

use std::alloc::{GlobalAlloc, Layout, System};
use std::cell::RefCell;
use std::hint::black_box;
use std::rc::Rc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Instant;

use ossido_lib::{Ssr, ossido_internal_init_v8_platform};

// ---------------------------------------------------------------------------
// Peak-tracking global allocator (Rust-side heap only).
// ---------------------------------------------------------------------------

struct Tracking;

static CURRENT: AtomicUsize = AtomicUsize::new(0);
static PEAK: AtomicUsize = AtomicUsize::new(0);

unsafe impl GlobalAlloc for Tracking {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let ptr = unsafe { System.alloc(layout) };
        if !ptr.is_null() {
            let cur = CURRENT.fetch_add(layout.size(), Ordering::Relaxed) + layout.size();
            PEAK.fetch_max(cur, Ordering::Relaxed);
        }
        ptr
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        CURRENT.fetch_sub(layout.size(), Ordering::Relaxed);
        unsafe { System.dealloc(ptr, layout) };
    }

    unsafe fn realloc(&self, ptr: *mut u8, layout: Layout, new_size: usize) -> *mut u8 {
        let new_ptr = unsafe { System.realloc(ptr, layout, new_size) };
        if !new_ptr.is_null() {
            if new_size >= layout.size() {
                let grow = new_size - layout.size();
                let cur = CURRENT.fetch_add(grow, Ordering::Relaxed) + grow;
                PEAK.fetch_max(cur, Ordering::Relaxed);
            } else {
                CURRENT.fetch_sub(layout.size() - new_size, Ordering::Relaxed);
            }
        }
        new_ptr
    }
}

#[global_allocator]
static ALLOC: Tracking = Tracking;

/// Run `f` and return its result plus the peak *additional* Rust bytes live at
/// any instant during the call.
fn measure_peak<R>(f: impl FnOnce() -> R) -> (R, usize) {
    let base = CURRENT.load(Ordering::Relaxed);
    PEAK.store(base, Ordering::Relaxed);
    let out = f();
    let peak = PEAK.load(Ordering::Relaxed);
    (out, peak.saturating_sub(base))
}

// ---------------------------------------------------------------------------
// Bench bundle: exposes the same contract as a real ossido SSR bundle, producing
// a document of a caller-chosen byte size (the payload is the target size).
// ---------------------------------------------------------------------------

const BENCH_BUNDLE: &str = r#"
(function (exports) {
  function build(payload) {
    var size = parseInt(payload, 10) || 1024;
    var unit = "<div class='row'>lorem ipsum dolor sit amet consectetur adipiscing elit</div>";
    var reps = Math.ceil(size / unit.length);
    var parts = new Array(reps);
    for (var i = 0; i < reps; i++) parts[i] = unit;
    return "<!DOCTYPE html><html><body>" + parts.join("") + "</body></html>";
  }
  exports.renderFn = function (payload) {
    return build(payload);
  };
  exports.renderStream = function (payload) {
    var html = build(payload);
    var CHUNK = 4096;
    for (var i = 0; i < html.length; i += CHUNK) {
      __ssr_write(html.slice(i, i + CHUNK));
    }
  };
  return exports;
})({})
"#;

const SIZES: [usize; 3] = [1024, 64 * 1024, 1024 * 1024];

fn time<F: FnMut()>(iters: u32, mut f: F) -> f64 {
    let start = Instant::now();
    for _ in 0..iters {
        f();
    }
    start.elapsed().as_nanos() as f64 / f64::from(iters)
}

fn fmt_bytes(n: f64) -> String {
    if n >= 1024.0 * 1024.0 {
        format!("{:.2} MiB", n / (1024.0 * 1024.0))
    } else if n >= 1024.0 {
        format!("{:.2} KiB", n / 1024.0)
    } else {
        format!("{n:.0} B")
    }
}

fn fmt_time(ns: f64) -> String {
    if ns >= 1_000_000.0 {
        format!("{:.2} ms", ns / 1_000_000.0)
    } else if ns >= 1_000.0 {
        format!("{:.2} µs", ns / 1_000.0)
    } else {
        format!("{ns:.0} ns")
    }
}

/// Run the streaming export with `sink` installed as the chunk sink, using
/// ssr_rs's opt-in `Ssr::streaming` helper (the same path ossido takes).
fn stream(ssr: &mut Ssr<'static, 'static>, payload: &str, mut sink: impl FnMut(&str)) {
    ssr.streaming("__ssr_write")
        .unwrap()
        .render("renderStream", Some(payload), &mut sink)
        .unwrap();
}

fn main() {
    ossido_internal_init_v8_platform();
    let mut ssr = Ssr::from(BENCH_BUNDLE.to_string(), "").expect("failed to compile bench bundle");

    // Warm up: first render compiles paths.
    let _ = ssr.render("renderFn", Some("1024")).unwrap();
    stream(&mut ssr, "1024", |c| {
        black_box(&c);
    });

    println!("streaming SSR vs buffered full-string render");
    println!(
        "(peak = Rust-side heap only; V8-internal render memory is excluded — identical for both)\n"
    );
    println!(
        "{:<10} | {:<22} | {:>11} | {:>13} | {:>12}",
        "doc size", "path", "time/op", "throughput", "peak heap"
    );
    println!(
        "{:-<11}+{:-<24}+{:-<13}+{:-<15}+{:-<14}",
        "", "", "", "", ""
    );

    for &size in &SIZES {
        let payload = size.to_string();
        let payload = payload.as_str();
        // Keep total work roughly constant across sizes, with a sane floor.
        let iters = u32::try_from((50_000_000 / size).max(30)).unwrap_or(u32::MAX);

        // 1. Buffered — one big String.
        let buffered_ns = time(iters, || {
            let html = ssr.render("renderFn", Some(payload)).unwrap();
            black_box(&html);
        });
        let (_, buffered_peak) = measure_peak(|| ssr.render("renderFn", Some(payload)).unwrap());

        // 2. Streaming, drained — each chunk forwarded and dropped immediately.
        //    (The sink is only borrowed for the render, so it captures nothing here.)
        let stream_drain_ns = time(iters, || {
            stream(&mut ssr, payload, |c| {
                black_box(&c);
            });
        });
        let (_, stream_drain_peak) = measure_peak(|| {
            stream(&mut ssr, payload, |c| {
                black_box(&c);
            });
        });

        // 3. Streaming, collected — chunks reassembled into one String. The sink
        //    owns a shared handle to the buffer (mirrors a real owned sink).
        let stream_collect_ns = time(iters, || {
            let out = Rc::new(RefCell::new(String::new()));
            let sink = Rc::clone(&out);
            stream(&mut ssr, payload, move |c| sink.borrow_mut().push_str(c));
            black_box(&*out.borrow());
        });
        let (_, stream_collect_peak) = measure_peak(|| {
            let out = Rc::new(RefCell::new(String::new()));
            let sink = Rc::clone(&out);
            stream(&mut ssr, payload, move |c| sink.borrow_mut().push_str(c));
            out
        });

        let rows = [
            ("buffered", buffered_ns, buffered_peak),
            ("streaming (drained)", stream_drain_ns, stream_drain_peak),
            (
                "streaming (collected)",
                stream_collect_ns,
                stream_collect_peak,
            ),
        ];
        for (label, ns, peak) in rows {
            let mib_s = size as f64 / (ns / 1e9) / (1024.0 * 1024.0);
            let throughput = format!("{mib_s:.0} MiB/s");
            println!(
                "{:<10} | {:<22} | {:>11} | {:>13} | {:>12}",
                fmt_bytes(size as f64),
                label,
                fmt_time(ns),
                throughput,
                fmt_bytes(peak as f64),
            );
        }
        println!(
            "{:-<11}+{:-<24}+{:-<13}+{:-<15}+{:-<14}",
            "", "", "", "", ""
        );
    }
}
