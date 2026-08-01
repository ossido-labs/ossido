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
      Key gotcha: an `async fn` captures _all_ its params, so `Response` (holding a
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
  old per-worker model → no memory increase).

  Pool size is configurable via **`ssr.renderThreads` in `tuono.config.ts`**
  (DONE 2026-08-01) — TS `TuonoConfig.ssr` → normalized (`null` = auto) →
  `config.json` → Rust `SsrConfig`; precedence is `TUONO_SSR_THREADS` env >
  config > available parallelism. Each pool thread pre-warms its isolate at
  startup (#7, done) so the first request skips the V8 compile.

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

- [x] **2. True streaming SSR.** DONE (2026-08-01) — approach (a), bridging the
      V8 render to an axum streaming body so the shell flushes without waiting for
      the whole page.
      - **ssr_rs 0.9.0** adds `render(entry, params)` (single named export) and
        `render_to_stream(entry, params, on_chunk)` (invokes `__tuono_stream_write`
        per chunk). Consumed locally via the `[patch.crates-io]` override until
        published.
      - **JS** (`ssr/server.tsx`): `serverSideRendering` now returns two named
        exports — `renderFn` (buffered, for error pages / SSG / dev fallback) and
        `renderStream` (iterates `renderToReadableStream` *without* `allReady`,
        writing each chunk through the injected `__tuono_stream_write`). A shell
        error rejects before any chunk, so the status can still be an error.
      - **Rust**: `Js::render_stream` + a `Job::Stream` variant on the render pool
        that forwards chunks over an **unbounded** channel (never block a render
        thread on a slow client) into `Body::from_stream`; `finish_render` decides
        the status from the first message (chunk → 200 stream, terminal-error →
        500) then streams the rest. Only the page GET path streams; JSON / redirect
        / custom / error stay buffered.
      - **Gotcha:** the ssr_rs `TextDecoder` polyfill (`fast-text-encoding`) rejects
        the `{ stream: true }` option, so streaming decode uses a hand-rolled
        incremental UTF-8 decoder (`createUtf8Streamer`) that holds back incomplete
        trailing multi-byte sequences across chunk boundaries.
      - **Side fix:** the dev error overlay (Shiki grammars, ~9 MB) was being
        bundled into the **prod** SSR/client bundles because `RouterProvider`'s
        `{mode === 'Dev' && <DevErrorOverlayHost/>}` guard is a *runtime* check that
        can't be tree-shaken. Gated the import with the build-time constant
        `import.meta.env.DEV` so prod eliminates the branch and drops the overlay
        (prod SSR bundle **9.4 MB → 293 KB**; the dev bundle still ships it).
      _Impact: medium–high (TTFB on large pages) · Effort: high · Risk: medium._

  > Note: data is pre-resolved in Rust, so the only Suspense boundary today is the
  > lazy route component — the shell still flushes first and the route content
  > follows as a streamed reveal.
  >
  > Test layering (each layer one job): `tuono_lib` `server_test` drives the
  > Rust server/pool/streaming plumbing against a small **hand-written** SSR
  > bundle stub (`tests/assets/fake_ssr_bundle.js` — reviewable, no JS build
  > dependency); `createUtf8Streamer` has a `vitest` unit test covering
  > multi-byte chunk-boundary splits; and the Playwright e2e
  > (`streaming.spec.ts`) covers real `react-dom/server` streaming through the
  > ssr_rs V8 runtime against a real build. (Replaces the old committed 245 KB
  > real-React fixture, which drifted silently and was unreviewable.)

---

## Tier 2 — per-request allocation / redundant work

- [~] **3. Excessive props (de)serialization across the runtime boundary.**
  See the dedicated section below — this is the current focus.
  _Impact: scales with payload size · Effort: low–medium · Risk: low._

- [x] **4. `Request` is deep-cloned N+1× per request.** (DONE 2026-08-01)
      The join calls `tuono_internal_props(req.clone(), …)` for the page and each
      layout (`source_builder.rs`); `Request` owned a `HeaderMap` cloned each time
      (plus the initial `headers().to_owned()`). Fix: `Request.headers` is now
      `Arc<HeaderMap>` (`request.rs`), so `req.clone()` shares the header map instead
      of deep-copying it. Read access (`req.headers.get(..)`) is unchanged via
      `Deref`; only the internal form-data tests (which mutated headers) were
      restructured to build the map before construction. `uri`/`params`/`body` stay
      as-is (cheap or usually empty for SSR). Scales with chain length.
      _Impact: low–medium · Effort: low–medium · Risk: low._

- [x] **5. Prod manifest lookup clones on every request.** (DONE 2026-08-01)
      `get_bundle_from_pathname` returned `bundle.clone()` (cloning `Vec<String>`s).
      Fix: it now returns `&RouteBundle` (borrowed from the `'static` `MANIFEST`, with
      a `static EMPTY_BUNDLE` fallback), and `Payload.js_bundles`/`css_bundles` are
      `Option<&'a Vec<String>>` serialised by reference (`manifest.rs`, `payload.rs`).
      The dynamic-route cache-miss path still allocates `Vec<&str>` — left as-is
      (only hit when no exact match, and the alloc is small).
      _Impact: low (every prod request) · Effort: low · Risk: low._

- [x] **6. Dev did an `fs::metadata` stat every request** (`ssr.rs`). (DONE 2026-08-01)
      Fix: a per-thread 250 ms debounce (`LAST_CHECK` thread-local) — within the
      window the cached isolate is reused without a `stat`; a hot-reload is still
      picked up within 250 ms (far below a vite rebuild's duration).
      _Impact: low (dev only) · Effort: low · Risk: low._

---

## Tier 3 — speculative / bigger bets

- [~] **7. Isolate pre-warm + V8 startup snapshot.** (pre-warm DONE 2026-08-01)
  Compilation was lazy per thread (`ssr.rs`) with no pre-warm, so the first hit on
  each pool thread was slow. Fix: each render-pool thread now compiles + caches its
  isolate at startup with a throwaway `Js::render_to_string(None)` before entering
  its job loop (`render_pool.rs`), guarded by `catch_unwind` so a warm-up that
  can't complete (dev before first build / missing prod bundle) leaves the thread
  serving normally. Runs after `GLOBAL_MODE`/`GLOBAL_CONFIG`/manifest are set.
  **Measured** (prod fixture, pool=1, request after the idle warm-up window):
  cold first request **108 ms** → warm **4 ms** (the ~104 ms V8 compile moves off
  the request path to the idle startup window; without pre-warm one such slow
  request is paid per pool thread).
  _Remaining:_ a V8 startup snapshot (compile once → snapshot → cheap per-isolate
  restore, also sharing compiled state to cut memory) — depends on an `ssr_rs`
  capability, deferred.
  _Impact: medium (cold start / memory) · Effort: medium · Risk: medium._

- [ ] **8. SSG for static routes / HTML micro-cache.**
      In prod, static (`○`) routes still render through V8 on every request
      (`server.rs` falls through to `catch_all`). Pre-render data-less routes to HTML
      at build time and serve them as files (skip V8 entirely), or add a short-TTL
      HTML cache keyed by path+payload for hot pages.
      _Impact: high for static-heavy apps · Effort: high · Risk: medium._

  Note: this item is about the **dynamic prod server** serving static routes
  without V8. The separate **static export** (`tuono build --static`) is a
  different deliverable and now supports **dynamic routes** too, via a
  `#[tuono_lib::static_paths]` enumerator per dynamic `page.rs` (2026-08-01):
  the codegen exposes an internal `/__tuono/static_paths/<module>` endpoint, and
  the build substitutes each returned param set into the route pattern (single
  `[param]` and catch-all `[...slug]`, validated) to render every concrete
  page + its data JSON. `--static` now aborts only for a dynamic route that
  declares no enumerator (was: any dynamic route at all).

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

| step         | JSON          | msgpack (named)        |
| ------------ | ------------- | ---------------------- |
| Rust encode  | 421 µs        | **236 µs** ✅          |
| V8 decode    | **953 µs** ✅ | 1782 µs                |
| V8 re-encode | **735 µs** ✅ | 1631 µs                |
| **total**    | **~2109 µs**  | ~3649 µs (1.7× slower) |

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
  _slower_ than native `JSON.parse`, so the V8 decode step may **regress**.
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
