//! Benchmark: render an arbitrary SSR bundle's exports through `ossido_ssr`.
//!
//! Run with:
//!   OSSIDO_BENCH_BUNDLE=/path/to/bundle.js \
//!     cargo bench -p ossido --bench react_render
//!
//! The bundle must be a self-contained ES module. Every exported function is
//! benchmarked by name (called with no payload and awaited if async), so the
//! same bundle can expose several pipeline variants for comparison — e.g. the
//! production `prerender`→stream→string path next to a bare `renderToString`.
//! Pair it with the same bundle under `node` to separate engine effects from
//! pipeline (polyfill / event-loop) effects.

use std::hint::black_box;
use std::time::Instant;

use ossido::{Ssr, ossido_internal_init_v8_platform};

const WARMUP: usize = 10;
const ITERS: usize = 30;

fn median(samples: &mut [f64]) -> f64 {
    samples.sort_by(|a, b| a.total_cmp(b));
    samples[samples.len() / 2]
}

fn main() {
    let bundle_path = std::env::var("OSSIDO_BENCH_BUNDLE")
        .expect("set OSSIDO_BENCH_BUNDLE to the bundle to benchmark");
    let source = std::fs::read_to_string(&bundle_path).expect("failed to read the bundle");

    ossido_internal_init_v8_platform();

    let build = Ssr::from_module_with_cache(source, None).expect("bench bundle failed to compile");
    let mut ssr = build.ssr;

    // The bundle decides what to expose; benchmark every exported function.
    // (Entry names come from the fn_map — probe the two known ones plus any
    // the caller mentions via OSSIDO_BENCH_ENTRIES.)
    let entries =
        std::env::var("OSSIDO_BENCH_ENTRIES").unwrap_or_else(|_| "renderFn,renderSync".to_string());

    for entry in entries.split(',').map(str::trim).filter(|e| !e.is_empty()) {
        for _ in 0..WARMUP {
            let _ = ssr.render(entry, None).expect("warm-up render failed");
        }
        let mut times = Vec::with_capacity(ITERS);
        let mut html_len = 0usize;
        for i in 0..ITERS {
            let start = Instant::now();
            let html = ssr.render(entry, None).expect("render failed");
            times.push(start.elapsed().as_secs_f64() * 1000.0);
            if i == 0 {
                html_len = html.len();
                // Small outputs are usually instrumentation JSON — show them.
                if html.len() < 500 && std::env::var("OSSIDO_BENCH_PRINT").is_ok() {
                    println!("ossido {entry} first output: {html}");
                }
            }
            black_box(&html);
        }
        println!(
            "ossido {entry}: html length {html_len}, median {:.2} ms over {ITERS}",
            median(&mut times)
        );
    }
}
