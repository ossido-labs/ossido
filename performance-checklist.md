# Tuono SSR performance checklist

A living list of SSR-pipeline performance opportunities identified from a review
of the render hot path (`ssr.rs`, `response.rs`, `payload.rs`, `source_builder.rs`
generated handlers, `catch_all.rs`, `server.rs`, `ssr/server.tsx`, `ssr/utils.ts`,
`manifest.rs`).

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done. Each item notes
rough **impact / effort / risk** — all speculative until measured.

## Measure first

Before optimising, attribute where request time actually goes:

- **`DEBUG=1`** already emits per-request `bundle read` / `v8 compile` /
  `ssr render` phases into the trace — use it to see the warm-request breakdown.
- Add a load benchmark (`oha` / `wrk`) with a concurrency sweep, watching p50/p99
  for both a **data route** and a **static route**. This tells us whether the
  ceiling is CPU-bound render time or async-I/O starvation.
- Optimisations should be validated with before/after numbers, not assumed.

---

## Tier 1 — structural (highest leverage)

- [x] **1. Offload V8 render off the async worker threads.** DONE (2026-08-01).
  Added a bounded render pool (`render_pool.rs`): a fixed set of OS threads, each
  owning a warm thread-local isolate, fed by a crossbeam MPMC queue; the async
  handlers submit the (serialized, `Send`) payload and `await` a oneshot. Size
  defaults to `available_parallelism()`, overridable via `TUONO_SSR_THREADS`
  (floor 1). Render fns (`render_chain`, `render_error_to_string`, the macro's
  single-page handler, `catch_all`) are now async and route through the pool.
  Key gotcha: an `async fn` captures *all* its params, so `Response` (holding a
  non-`Send` `dyn Serialize`) can't be an async-fn param — split into a sync
  `into_render_job`/`error_render_job` (→ `Send` `RenderJob`) + async
  `finish_render`, and made the handler-macro match synchronous (the
  `Result<Response,…>` scrutinee is non-`Send` and mustn't span an await).

  **After (measured, same harness):** at `worker_threads=1`, the probe p99 under
  heavy load dropped **217 ms → 0.1 ms** and served requests went **19 →
  ~59,000** in 3 s — the tokio worker is fully freed while renders saturate the
  pool.

  | config (worker_threads=1) | probe p99 under load | probes/3 s | heavy req/s |
  | ------------------------- | -------------------- | ---------- | ----------- |
  | baseline (no pool)        | 217 ms               | 19         | 42          |
  | pool = 1 (1-core default) | 0.1 ms               | 59 454     | 40          |
  | pool = 16                 | 1.4 ms               | 20 373     | 132         |

  Render throughput at pool=1 is unchanged (still 1 core of rendering) — the fix
  is latency/responsiveness, as predicted. Isolate count = pool size (same as the
  old per-worker model → no memory increase). Follow-up: expose the pool size via
  `tuono.config.ts` (currently env-only); pre-warm isolates at start (#7).

  Original analysis + baseline, for reference:
  `render_chain` (`response.rs`) calls `Js::render_to_string` synchronously; the
  generated `async fn __tuono_ssr_*` (`source_builder.rs`) calls it un-awaited,
  and `catch_all.rs` does the same — all on the default multi-threaded
  `#[tokio::main]` runtime. A render monopolises a worker thread for its whole
  duration (the V8 isolate is thread-local, and a synchronous render has **no
  await points** so tokio can't interleave), so an SSR burst starves async I/O
  (accepting connections, reading bodies, data-fetch awaits, the vite proxy).
  Move rendering to `spawn_blocking` + a `Semaphore(num_cpus)`, or a dedicated
  bounded pool of threads each owning a warm isolate.
  _Impact: high (tail latency under load) · Effort: medium · Risk: medium._

  **Baseline measured (2026-08-01)** — prod fixture, `/heavy` = ~38 ms render
  (975 KB), 8 concurrent heavy loaders, probe = `/__tuono/data/` (no V8). This is
  a **constrained-machine problem**: catastrophic at low worker counts,
  negligible on a full box.

  | tokio workers | probe p99 idle | probe p99 under load | inflation | probes/3 s | heavy req/s |
  | ------------- | -------------- | -------------------- | --------- | ---------- | ----------- |
  | 1             | 0.5 ms         | 217 ms               | 414×      | 19         | 42          |
  | 2             | 0.5 ms         | 146 ms               | 324×      | 36         | 68          |
  | 16 (default)  | 0.4 ms         | 1.2 ms               | 2.7×      | 18 213     | 145         |

  Design implication: a bounded render pool (default `num_cpus`, floor 1) on its
  own thread(s) keeps the tokio worker free for I/O even at 1 worker — the OS
  time-slices the render thread, so a fast probe is served in ~ms instead of
  queuing behind whole renders. Fixes **latency/responsiveness** on constrained
  boxes, not render throughput (still core-bound). Reproduce: add a heavy route,
  `tuono build`, pin `worker_threads` in `.tuono/main.rs`, `cargo build
  --release`, run `scratchpad/serload.mjs` (probe idle vs under heavy load).

- [ ] **2. True streaming SSR (or drop the fake streaming).**
  `ssr/server.tsx` uses `renderToReadableStream` → `await stream.allReady` →
  `streamToString`, which fully buffers the HTML (`ssr/utils.ts`: chunks →
  `Uint8Array` → string → Rust `String` → axum bytes = 3–4 copies) with none of
  the streaming benefit. Either (a) bridge the V8 `ReadableStream` to an axum
  streaming body to flush the shell early, or (b) if staying buffered, switch to
  `renderToString` to shed the stream/decoder overhead and the MessageChannel
  polyfill. Note: data is pre-resolved in Rust, so there's little Suspense to
  stream — (b) may be the pragmatic win.
  _Impact: medium–high (TTFB on large pages) · Effort: (a) high / (b) low · Risk: (a) high / (b) low._

---

## Tier 2 — per-request allocation / redundant work

- [~] **3. Excessive props (de)serialization across the runtime boundary.**
  See the dedicated section below — this is the current focus.
  _Impact: scales with payload size · Effort: low–medium · Risk: low._

- [ ] **4. `Request` is deep-cloned N+1× per request.**
  The join calls `tuono_internal_props(req.clone(), …)` for the page and each
  layout (`source_builder.rs`); `Request` owns a `HeaderMap` cloned each time
  (plus the initial `headers().to_owned()`). Wrap the shared parts in `Arc` (or
  pass `Arc<Request>`) so the clones are near-free. Scales with chain length.
  _Impact: low–medium · Effort: low–medium · Risk: low._

- [ ] **5. Prod manifest lookup clones on every request.**
  `get_bundle_from_pathname` returns `bundle.clone()` (cloning `Vec<String>`s),
  and dynamic-route matching allocates `Vec<&str>` per request on a cache-miss.
  Return `&RouteBundle` and serialise by reference.
  _Impact: low (every prod request) · Effort: low · Risk: low._

- [ ] **6. Dev does an `fs::metadata` stat every request** (`ssr.rs`) to check
  the bundle mtime. Debounce it or drive invalidation from a file-watcher signal.
  _Impact: low (dev only) · Effort: low · Risk: low._

---

## Tier 3 — speculative / bigger bets

- [ ] **7. Isolate pre-warm + V8 startup snapshot.**
  Compilation is lazy per worker thread (`ssr.rs`) with no pre-warm, so the first
  hit on each thread is slow. Pre-warm all isolates at startup, and/or use a V8
  startup snapshot (compile once → snapshot → cheap per-isolate restore, also
  shares compiled state to cut memory). Depends on `ssr_rs` 0.8.3 capability.
  _Impact: medium (cold start / memory) · Effort: medium · Risk: medium._

- [ ] **8. SSG for static routes / HTML micro-cache.**
  In prod, static (`○`) routes still render through V8 on every request
  (`server.rs` falls through to `catch_all`). Pre-render data-less routes to HTML
  at build time and serve them as files (skip V8 entirely), or add a short-TTL
  HTML cache keyed by path+payload for hot pages.
  _Impact: high for static-heavy apps · Effort: high · Risk: medium._

---

## Focus: props serialization across the Rust ⇄ V8 ⇄ client boundary

### The full round trip today (per SSR request)

1. **Rust** — each handler's props (`Box<dyn Serialize>`) → `serde_json::Value`
   (`resolve_handler`, so it's `Send` across the join `await`) → `serde_json::to_string`
   (`payload.rs::client_payload`). **Two encode passes.**
2. **Rust → V8** — the JSON string is passed into V8 as a JS string argument.
3. **V8** — `JSON.parse(payload)` (`ssr/server.tsx`). **One parse.**
4. **V8** — the parsed object is **re-serialized** with `JSON.stringify(serverPayload)`
   and embedded in the HTML `<script>` (`shared/TuonoScripts.tsx`). **One re-encode
   of the exact same data.**
5. **Client** — the browser evaluates `window[...] = { … }` (native object-literal
   parse) on load; the client never re-parses (`shared/TuonoContext.tsx`).

So the same payload is encoded in Rust, parsed in V8, and **re-encoded in V8** —
a full parse + re-stringify round trip inside the isolate, every request.

### Guaranteed, format-agnostic wins (no downside)

- [x] **Eliminate the V8 re-stringify (step 4).** DONE (2026-07-31). The raw
  payload string V8 already received is threaded through the context to
  `TuonoScripts` and embedded verbatim (`dangerouslySetInnerHTML` +
  `suppressHydrationWarning`), instead of `JSON.stringify`-ing the parsed object
  again. JS-only change (no Rust); removes ~735 µs of V8 encode per large-payload
  request (per the benchmark). Bonus: `<` is escaped to `<`, closing a
  pre-existing `</script>` breakout gap in the old unescaped embed. Verified:
  clean hydration (0 errors), correct client payload, escaping confirmed via
  query-param injection, e2e 7/7.
- [x] **Eliminate the Rust double-encode (RawValue).** DONE (2026-08-01).
  `resolve_handler` now produces `Box<serde_json::value::RawValue>` (still
  `Send`) instead of a `serde_json::Value` tree; `HandlerData::Props`,
  `resolve_layouts` (`HashMap<String, Box<RawValue>>`), and the `Payload` /
  `JsonResponse` `layoutData` fields carry it through, so the chain payload is
  serialized once and spliced rather than built-then-re-serialized. Enabled the
  `serde_json` `raw_value` feature. Only affects layout-wrapped pages (the chain
  path); the single-page path already single-encoded. ~330 µs on a large-payload
  chain render (per the benchmark). Verified: `tuono_lib` 41 tests (incl.
  `chain_json_*` asserting correct `layoutData` JSON), full workspace tests,
  e2e 7/7.

  > Follow-up: no example/fixture has a data-providing `layout.rs`, so the chain
  > path has **no end-to-end coverage** — worth adding a layout-data fixture
  > route + e2e (would also cover `layoutData` hydration generally).

### Binary format (MessagePack/CBOR/…) — REJECTED (benchmarked 2026-07-31)

Verdict: **not worth it with a JS-side decoder.** A head-to-head micro-benchmark
(`serde_json` vs `rmp-serde` in Rust; native `JSON` vs `@msgpack/msgpack` in
Node/V8) on a representative 660 KB payload:

| step               | JSON     | msgpack (named) |
| ------------------ | -------- | --------------- |
| Rust encode        | 421 µs   | **236 µs** ✅   |
| V8 decode          | **953 µs** ✅ | 1782 µs    |
| V8 re-encode       | **735 µs** ✅ | 1631 µs    |
| **total**          | **~2109 µs** | ~3649 µs (1.7× slower) |

`@msgpack/msgpack` decode is ~1.9× slower than native `JSON.parse`, and encode
~2.2–2.5× slower than `JSON.stringify`. The Rust-side encode win (msgpack is
1.6–3.6× faster, 16–39% smaller) is dwarfed by the V8 decode penalty, and the
Rust⇄V8 hop is in-process so smaller size buys no bandwidth. Binary would only
win with **native** V8 (de)serialization (`v8::ValueDeserializer`), which
`ssr_rs` doesn't expose, and it would still regress the client bundle. Revisit
only if we ever drop to `rusty_v8`/`deno_core` directly.

Original caveats (all confirmed):

- **`JSON.parse`/`stringify` in V8 are native C++ and very fast.** A JS-side
  MessagePack decoder (e.g. `@msgpack/msgpack`) runs in JS and is typically
  *slower* than native `JSON.parse`, so the V8 decode step may **regress**.
- **The Rust ⇄ V8 hop is in-process** (a memcpy into a V8 string), not a network
  hop — so binary's smaller wire size saves memory/copies but not bandwidth.
- **The client boundary would regress:** to send binary to the browser we'd embed
  base64 + ship a MessagePack decoder in the **client bundle** (size + startup
  cost), replacing today's zero-cost native object-literal eval. (Avoidable only
  if we keep JSON for the client embed and binary just for Rust→V8.)
- **A real win needs V8-native (de)serialization** (`v8::ValueSerializer` /
  structured clone) so the decode is native, not a JS lib — but `ssr_rs` 0.8.3
  exposes only string in / string out, so this means extending/forking `ssr_rs`
  or dropping to `rusty_v8`/`deno_core`.
- The win **scales with payload size** — negligible for small prop payloads,
  potentially meaningful for data-heavy pages.

**Recommended approach:** land the two guaranteed wins above, then settle the
binary question with a **micro-benchmark** on a representative (large) payload
comparing, both encode and decode: `serde_json` vs `rmp-serde` (Rust) and native
`JSON.parse` vs `@msgpack/msgpack` (in V8). Only pursue binary if it beats native
JSON on the decode side — otherwise the Rust-side savings are eaten by a slower V8
decode and a heavier client bundle.
