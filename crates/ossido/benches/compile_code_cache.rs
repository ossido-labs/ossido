//! Benchmark: SSR bundle compile cost and warm-render tier-up.
//!
//! Run with:
//!   cargo bench -p ossido --bench compile_code_cache
//!
//! Two questions, measured against a synthesised multi-MB ES-module bundle
//! (deterministic — identical workload across runs and code checkpoints):
//!
//!   * compile — how long does `Ssr::from_module` take on a cold isolate?
//!     This is the cost every render-pool thread pays once (and pays again
//!     after a post-panic isolate invalidation or dev hot-reload).
//!   * render tier-up — how does per-render latency evolve as V8's tiering
//!     (Ignition → Sparkplug → Maglev → TurboFan) kicks in on a reused
//!     isolate? Reported as the latency of render #1/#2/#5/#10/#50 plus a
//!     steady-state median.
//!
//! The bundle is a plausible SSR shape: thousands of small component
//! functions sharing an escaping helper, all invoked per render.

use std::hint::black_box;
use std::time::Instant;

use ossido::{Ssr, ossido_internal_init_v8_platform};

/// Number of generated component functions. 3000 components ≈ 2 MB of JS,
/// comparable to a mid-size real-world server bundle.
const COMPONENTS: usize = 3000;
/// Cold-compile repetitions (each on a fresh isolate, dropped before the next
/// is created — rusty_v8 requires reverse-creation-order isolate drops).
const COMPILE_REPS: usize = 5;
/// Renders whose individual latencies are recorded for the tier-up curve.
const CURVE_RENDERS: usize = 50;
/// Renders for the steady-state median, after the curve renders warmed the isolate.
const STEADY_RENDERS: usize = 200;

/// Deterministically synthesise a self-contained ES-module SSR bundle.
fn synth_bundle(components: usize) -> String {
    let mut src = String::with_capacity(components * 700 + 4096);
    src.push_str(
        r#"
function esc(s) {
  var out = "";
  for (var i = 0; i < s.length; i++) {
    var c = s[i];
    if (c === "&") out += "&amp;";
    else if (c === "<") out += "&lt;";
    else if (c === ">") out += "&gt;";
    else if (c === '"') out += "&quot;";
    else out += c;
  }
  return out;
}
function attrs(obj) {
  var out = "";
  for (var k in obj) out += " " + k + '="' + esc(String(obj[k])) + '"';
  return out;
}
var registry = [];
"#,
    );

    for i in 0..components {
        src.push_str(&format!(
            r#"
function comp{i}(props) {{
  var rows = [];
  for (var j = 0; j < 6; j++) {{
    rows.push("<li" + attrs({{ "data-c": {i}, "data-j": j }}) + ">" + esc(props.title + " item " + (j * {i})) + "</li>");
  }}
  return "<section id=\"c{i}\"><h2>" + esc(props.title + " #{i}") + "</h2><ul>" + rows.join("") + "</ul></section>";
}}
registry.push(comp{i});
"#
        ));
    }

    src.push_str(
        r#"
export function renderFn(payload) {
  var props = payload ? JSON.parse(payload) : { title: "bench" };
  var parts = new Array(registry.length);
  for (var i = 0; i < registry.length; i++) parts[i] = registry[i](props);
  return "<!DOCTYPE html><html><body>" + parts.join("") + "</body></html>";
}
"#,
    );
    src
}

fn fmt_ms(ns: f64) -> String {
    format!("{:.2} ms", ns / 1_000_000.0)
}

fn median(samples: &mut [f64]) -> f64 {
    samples.sort_by(|a, b| a.total_cmp(b));
    samples[samples.len() / 2]
}

fn main() {
    ossido_internal_init_v8_platform();

    let source = synth_bundle(COMPONENTS);
    let payload = r#"{"title":"benchmark run"}"#;
    println!(
        "bundle: {} components, {:.2} MiB of JS\n",
        COMPONENTS,
        source.len() as f64 / (1024.0 * 1024.0)
    );

    // ------------------------------------------------------------------
    // 1. Cold compile: fresh isolate, full parse + compile + evaluate.
    // ------------------------------------------------------------------
    let mut cold = Vec::with_capacity(COMPILE_REPS);
    for rep in 0..COMPILE_REPS {
        let start = Instant::now();
        let ssr = Ssr::from_module(source.clone()).expect("bench bundle failed to compile");
        let ns = start.elapsed().as_nanos() as f64;
        cold.push(ns);
        println!("cold compile #{}: {}", rep + 1, fmt_ms(ns));
        drop(ssr);
    }
    println!("cold compile median: {}\n", fmt_ms(median(&mut cold)));

    // ------------------------------------------------------------------
    // 1b. Code cache: eager produce once, then consume per fresh isolate
    //     (the render pool's threads 2..N and post-panic recompile path).
    // ------------------------------------------------------------------
    let start = Instant::now();
    let produced =
        Ssr::from_module_with_cache(source.clone(), None).expect("bench bundle failed to compile");
    let produce_ns = start.elapsed().as_nanos() as f64;
    let cache = produced
        .produced_cache
        .expect("eager compile should produce a code cache");
    drop(produced.ssr);
    println!(
        "eager produce compile: {} (cache: {:.2} MiB)",
        fmt_ms(produce_ns),
        cache.len() as f64 / (1024.0 * 1024.0)
    );

    let mut cached = Vec::with_capacity(COMPILE_REPS);
    for rep in 0..COMPILE_REPS {
        let start = Instant::now();
        let build = Ssr::from_module_with_cache(source.clone(), Some(&cache))
            .expect("bench bundle failed to compile from cache");
        let ns = start.elapsed().as_nanos() as f64;
        assert!(!build.cache_rejected, "fresh cache must not be rejected");
        cached.push(ns);
        println!("cached compile #{}: {}", rep + 1, fmt_ms(ns));
        drop(build.ssr);
    }
    println!("cached compile median: {}\n", fmt_ms(median(&mut cached)));

    // ------------------------------------------------------------------
    // 2. Render tier-up curve + steady state on one reused isolate.
    // ------------------------------------------------------------------
    let mut ssr = Ssr::from_module(source.clone()).expect("bench bundle failed to compile");

    let mut curve = Vec::with_capacity(CURVE_RENDERS);
    for _ in 0..CURVE_RENDERS {
        let start = Instant::now();
        let html = ssr.render("renderFn", Some(payload)).unwrap();
        curve.push(start.elapsed().as_nanos() as f64);
        black_box(&html);
    }
    for n in [1usize, 2, 5, 10, 50] {
        println!("render #{n}: {}", fmt_ms(curve[n - 1]));
    }

    let mut steady = Vec::with_capacity(STEADY_RENDERS);
    for _ in 0..STEADY_RENDERS {
        let start = Instant::now();
        let html = ssr.render("renderFn", Some(payload)).unwrap();
        steady.push(start.elapsed().as_nanos() as f64);
        black_box(&html);
    }
    println!(
        "steady-state median ({} renders after warm-up): {}",
        STEADY_RENDERS,
        fmt_ms(median(&mut steady))
    );
}
