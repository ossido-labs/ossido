//! Measure how process RSS scales with the number of live V8 isolates — i.e.
//! how much memory the render pool spends holding one compiled-bundle isolate
//! per thread. This sizes the potential win of a V8 **startup snapshot**
//! (checklist #7), which would let isolates share compiled state instead of each
//! compiling the bundle independently.
//!
//! V8 allocates in its own C++ heap, invisible to a Rust allocator, so we read
//! the OS resident set size (`ps`). And because `ssr_rs` assumes one isolate per
//! thread (as the pool does), each isolate lives on its own real thread.
//!
//! Build once, then sweep N in a separate process per point (clean isolation):
//!   cargo build --release --example isolate_memory
//!   for n in 0 1 2 4 8 16; do \
//!     target/release/examples/isolate_memory <bundle.js> $n; done

use std::sync::{Arc, Barrier};
use std::thread;

use tuono_lib::{Ssr, tuono_internal_init_v8_platform};

/// Resident set size of this process, in KiB (via `ps`; works on macOS/Linux).
fn rss_kib() -> u64 {
    let pid = std::process::id().to_string();
    let out = std::process::Command::new("ps")
        .args(["-o", "rss=", "-p", &pid])
        .output()
        .expect("failed to run ps");
    String::from_utf8_lossy(&out.stdout)
        .trim()
        .parse()
        .unwrap_or(0)
}

fn main() {
    let mut args = std::env::args().skip(1);
    let bundle_path = args
        .next()
        .expect("usage: isolate_memory <bundle.js> <n_isolates>");
    let n: usize = args
        .next()
        .and_then(|s| s.parse().ok())
        .expect("usage: isolate_memory <bundle.js> <n_isolates>");

    tuono_internal_init_v8_platform();
    let source = std::fs::read_to_string(&bundle_path).expect("failed to read bundle");
    let baseline = rss_kib();

    if n == 0 {
        println!("n=0  baseline_rss={baseline} KiB");
        return;
    }

    // `warmed`: every worker has compiled + warmed its isolate.
    // `hold`: keep every isolate alive until main has measured.
    let warmed = Arc::new(Barrier::new(n + 1));
    let hold = Arc::new(Barrier::new(n + 1));

    let handles: Vec<_> = (0..n)
        .map(|_| {
            let source = source.clone();
            let warmed = Arc::clone(&warmed);
            let hold = Arc::clone(&hold);
            thread::Builder::new()
                .stack_size(2 * 1024 * 1024)
                .spawn(move || {
                    // `from` compiles the bundle (the state a snapshot would
                    // share); one render warms it to the pool's steady state.
                    let mut ssr = Ssr::from(source, "").expect("failed to compile bundle");
                    let _ = ssr.render("renderFn", None);
                    warmed.wait();
                    hold.wait();
                    drop(ssr);
                })
                .expect("spawn")
        })
        .collect();

    warmed.wait();
    let rss = rss_kib();
    let delta = rss.saturating_sub(baseline);
    println!(
        "n={n:<2} baseline_rss={baseline} KiB  rss={rss} KiB  delta={delta} KiB  per_isolate={:.0} KiB",
        delta as f64 / n as f64
    );

    hold.wait();
    for h in handles {
        h.join().unwrap();
    }
}
