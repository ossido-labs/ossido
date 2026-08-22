# Runtime globals

`ossido_ssr` isolates are bare V8 — no Node, no browser, no web platform.
Everything a server bundle can rely on beyond the JS language itself is
installed by this module, before the bundle evaluates. Each global is declared
once in the `runtime_globals!` registry in [`mod.rs`](./mod.rs) (a
`function`/`bootstrap` line per entry, inspired by Bun's `#[JsClass]`
registration) and implemented in a dedicated file.

| Global | Backing | Notes |
| --- | --- | --- |
| `setTimeout` / `setImmediate` / `clearTimeout` / `clearImmediate` | native ([`timers.rs`](./timers.rs)) | Virtual-time macrotask queue: draining jumps the clock to the next due timer, so `setTimeout(fn, 500)` fires without wall-clock waiting. Module isolates only — classic-script (`Ssr::from`) isolates are microtask-only by design. |
| `TextEncoder` / `TextDecoder` | native ([`text_codecs.rs`](./text_codecs.rs)) | Full WHATWG surface: `encode`, allocation-free `encodeInto`, every decoder label (`windows-125x`, `shift_jis`, `utf-16le`, …) via `encoding_rs`, plus `fatal`, `ignoreBOM`, and `{stream: true}`. Valid UTF-8 fast-paths (SIMD-validated) straight into V8 strings; measured at or above Node's native codecs. |
| `MessageChannel` / `MessagePort` / `MessageEvent` / `Event` | bootstrap over native timers ([`message_channel.rs`](./message_channel.rs)) | `postMessage` delivers as one macrotask — the scheduling contract React's Fizz renderer depends on. Undefined in timerless classic isolates rather than faking async delivery. |
| `URLSearchParams` | native codec + bootstrap state ([`url_search_params.rs`](./url_search_params.rs)) | Full spec surface. Parse/serialize (`+`-as-space, percent-escaping) is native via `form_urlencoded`; the pair list lives in JS where the JIT handles it well. |
| `queueMicrotask` | native ([`scope.rs`](./scope.rs)) | Feeds V8's own microtask queue (V8 does not expose this global to embedders itself). |
| `global` | bootstrap ([`scope.rs`](./scope.rs)) | Alias of `globalThis`, for UMD-style module wrappers. |

## Conventions

- **Install order**: native functions first, then bootstraps — a bootstrap may
  reference any registered function (the `__ossido_*` backends are internal
  API, not a public surface).
- **Bundles win**: everything installs *before* the bundle evaluates, and
  bootstraps use `globalThis.X = globalThis.X || …` guards — so a bundle (or
  its conditional polyfills) that defines a global keeps its own. Bundle-side
  shims remain harmless.
- **Isolate-slot state** (the timer queue, streaming-decoder registry) is
  installed explicitly by the constructors in `ssr.rs`, owned by the `Ssr`,
  and freed on drop. The registry only covers context-scoped surface.

## Deliberately not provided

- **`ReadableStream`** — bundles ship `web-streams-polyfill`, which measures
  as effectively free in render benchmarks; the Web Streams spec is large
  enough that a native port is its own project.
- **`fetch`** — a render must not perform live I/O; the event loop
  intentionally aborts renders that wait on work no timer will resolve.

## Adding a global

1. Implement the native callback(s) and/or bootstrap snippet in a new file in
   this directory.
2. Add its `function "name" = module::callback;` / `bootstrap module::SCRIPT;`
   line(s) to `runtime_globals!` in `mod.rs`.
3. Cover the observable contract with a `assert_js_checks` test in `ssr.rs`.

If a future global needs per-call performance beyond an API callback (a
high-frequency, allocation-free signature), the registry is also the seam for
a `FunctionTemplate` + V8 Fast API variant — and, should the surface grow
large, for prebaking the installed context into a startup snapshot (the
registry already knows every callback an external-references table would
need).
