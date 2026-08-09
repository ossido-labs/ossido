# Learning Ossido — Topic Map

Everything you need to know to be productive with Ossido, ordered roughly from
"first day" to "advanced". Each entry is a topic, not a tutorial — the one-liner
tells you what it covers.

---

## 1. Mental model & architecture

- **What Ossido is** — a full-stack framework: React frontend + Rust (axum) backend, one project, one dev server.
- **The two-runtime picture** — the Rust HTTP server, the V8 engine that renders React on the server, and Vite for the client build.
- **Request lifecycle** — request → Rust handler produces data → React is server-rendered with that data → HTML streamed → client hydrates.
- **The Rust/React boundary** — what lives in Rust (data, routing, handlers) vs. React (UI), and how data crosses it as props.
- **Static (SSG) vs. Server (SSR)** — the two output modes and when each applies.

## 2. Installation & project setup

- **Prerequisites** — Rust toolchain, Node/Bun, and the `ossido` CLI (`cargo install ossido_cli`, binary is `ossido`).
- **`ossido new` wizard** — interactive scaffolding.
- **Feature flags** — `--tailwind`, `--mdx`, `--output static|server`, `--alias`, `--template`, `--head`, `--yes`.
- **Project layout** — `src/routes/`, `ossido.config.ts`, `Cargo.toml`, `package.json`, and the generated `.ossido/` directory.
- **Dependencies** — the `ossido` crate (Rust runtime) and the `ossido` npm package (JS runtime), plus how versions line up.

## 3. The CLI

- **`ossido dev`** — dev server, HMR, type generation, hot compile/bundle.
- **`ossido build`** — production build; `--static` / `--server`, `--no-js-emit`.
- **`ossido new`** — scaffolding (see §2).
- **The generated `.ossido/` directory** — what codegen produces (route tree, server entry) and why you don't edit it.

## 4. Configuration (`ossido.config.ts`)

- **`OssidoConfig` type** — imported from `ossido/config`.
- **`server`** — `port`, `host`.
- **`output`** — `static` vs `server`.
- **`viewTransitions`** — `true` to animate client navigations via the browser View Transitions API (default `false`). See §7.
- **`build` hooks** — `build.prebuild` / `build.postbuild` async functions run around `ossido build` (both modes). Each gets a context: `mode`, `outputDirectory` (`out/static` for static, `out` for server), `publicDirectory`, `manifest` (emitted file list), and the resolved `config` — e.g. to write a `.nojekyll`/`CNAME` or push the output to a static host.
- **`render_threads`** — SSR render-pool sizing.
- **`logging`** — format, level, browser forwarding, prod JSON.
- **Vite passthrough / plugins** — adding Vite plugins and config.
- **Path aliases** — e.g. `@/*` → `./src/*`, kept in sync with `tsconfig`.

## 5. File-based routing

- **`src/routes` convention** — folders become URL segments.
- **`page.tsx` + `page.rs` pairing** — a route's React view and its Rust data handler.
- **Dynamic routes** — `[param]` segments and how params reach the handler.
- **Catch-all routes** — `[...slug]`.
- **Layouts** — `layout.tsx`, the root layout, and nested layouts.
- **`loading.tsx`** — Suspense fallback per route.
- **`not-found.tsx`** — unmatched-route UI.
- **API routes** — `routes/api/*.rs` endpoints (no React view).
- **Route middleware** — `middleware.rs` at a route/segment level.
- **Naming rules** — reserved filenames and segment conventions.

## 6. Rust backend — handlers & data

- **`#[handler]`** — the page data loader (the "server-side props" equivalent).
- **`Request`** — the request extractor.
- **Route params** — reading dynamic segments in a handler.
- **`#[Props]` + `#[Type]` attribute macros** — mark a struct as page props / a shared type; each auto-adds `serde::{Serialize, Deserialize}` and generates the TypeScript type (`#[Props]` also adds the `Response` conversion).
- **Returning data** — how a handler's return value becomes the page component's props.
- **`Logger`** — structured logging from handlers.
- **`Response` / `Payload`** — status codes, redirects, custom responses.
- **`#[api]`** — HTTP API endpoints and methods.
- **`#[middleware]`** — request middleware; returns a `tower::Layer` (`tower` is re-exported from `ossido`, like `axum`; `tower_http` is opt-in).
- **Application state** — defining and injecting shared server state into handlers (via `src/app.rs`'s `main()`).
- **Cookies** — via the re-exported `cookie` extractor.
- **axum / tower re-exports** — using `ossido::axum` and `ossido::tower` types directly.
- **Error handling** — `ServerError`, `ErrorSource`, `catch_handler`, error pages, and `set_error_handler` — a global async hook (registered in `app.rs`'s `main()`, given an `ErrorContext`) to report errors (Sentry, etc.) and optionally return a custom response.
- **`#[static_paths]`** — enumerate params for SSG of dynamic routes (`StaticPaths`, `StaticParams`, `SegmentValue`).

## 7. React frontend

- **Page components** — receiving typed props from the Rust handler.
- **Layouts & `children`** — composing shells around pages.
- **Client navigation** — the `ossido-router` `Link` and navigation hooks.
- **View transitions** — with `viewTransitions: true` in the config, `push`/`replace`/`<Link>`/back-forward navigations run inside `document.startViewTransition` (a crossfade by default). Override per navigation with `push(path, { viewTransition: false })` or `<Link viewTransition={false}>`. No-ops where unsupported or under `prefers-reduced-motion`. Customise with CSS — e.g. give a shared element `style={{ viewTransitionName: 'hero' }}` on both pages, and animate `::view-transition-group(hero)` / `::view-transition-old(root)` / `::view-transition-new(root)`.
- **Router hooks** — current location, params, programmatic navigation.
- **Head / metadata** — setting title and head tags.
- **Loading & error boundaries** — how `loading.tsx` / error UI wire into Suspense.
- **Hydration model** — what happens client-side after SSR, and the server payload (`__OSSIDO_SERVER_PAYLOAD__`).
- **Preloading** — route code-splitting and `preload()`.
- **Typed API client** — `apiClient` from `ossido/client`: `apiClient.post('/api/path', { params, ...fetchOptions })`. The method is the client method name; the URL, route `params`, and the `.json()` response are typed from the generated route map. (Request body/query typing is planned via an OpenAPI extension of `#[api]`.)

## 8. SSR, SSG & streaming

- **Server-side rendering** — the `server` output mode.
- **Static generation** — the `static` output mode + `#[static_paths]`.
- **Streaming SSR** — chunked HTML (shell then tail).
- **Top-level await** — supported in the SSR bundle (ESM module rendering).
- **The render pool** — `render_threads`, isolate reuse, throughput.

## 9. TypeScript integration

- **Generated types** — Rust `Type` derives → `.ts` definitions consumed by pages.
- **Type-safe props** — end-to-end typing from handler to component.
- **`ossido/config` types** — typing the config file.
- **`tsconfig` & path aliases** — keeping TS and the framework in agreement.

## 10. Styling

- **Tailwind** — enabling it (feature flag / plugin) and the global stylesheet.
- **Global CSS** — where global styles live and how they're loaded.
- **CSS modules / Vite CSS** — component-scoped styles via Vite.

## 11. MDX (`ossido-mdx`)

- **Enabling MDX** — the `ossido-mdx/vite` plugin (`ossidoMdx()`).
- **`mdx-components.tsx`** — the Next.js-style `useMDXComponents` provider.
- **MDX as routes/content** — authoring pages in Markdown.

## 12. Package ecosystem

- **`ossido`** — the JS runtime, `ossido/config`, and the build pipeline.
- **`ossido-router`** — client router, `Link`, hooks, route types.
- **`ossido-ui`** — error UI / shared design-system components.
- **`ossido-mdx`** — MDX support (see §11).
- **`ossido-eslint-plugin`** — lint rules (oxlint JS-plugin + ESLint-compatible wrapper).
- **`ossido-react-vite-plugin`** — the React/Vite integration plugin.

## 13. Tooling & developer experience

- **Dev server & HMR** — how updates apply.
- **React Fast Refresh boundaries** — the whole-module rule (why a file must export only components) and what forces a full reload.
- **Linting** — oxlint with the ossido plugin; the `@oxlint/plugins` version-match requirement for the LSP.
- **Logging format** — unified `[BE]`/`[FE]` single-line logs, colours, browser forwarding, prod JSON.
- **Environment variables** — how env is read and exposed.
- **Vite integration** — where framework config meets your own Vite setup.

## 14. Building & deploying

- **Build outputs** — the static site vs. the standalone server binary.
- **Running the production server** — serving `ossido build --server` output.
- **Static hosting** — deploying `ossido build --static` output.
- **`.ossidoignore`** — a project-root file of glob patterns (gitignore-style: one per line, `#` comments); matching files are removed from the build output (`out/client`, `out/server`, `out/static`) — e.g. keep a draft asset or a `.map` out of the deploy.
- **Production config & env** — port/host, logging (JSON), render threads in prod.

## 15. Internals (nice to understand, not required day-to-day)

- **Render pool & threading** — isolate management under load.
- **Dev proxies** — the Vite reverse proxy and websocket proxy.
- **The manifest** — asset resolution.
- **Catch-all rendering & error pages** — the fallback render path.
- **Debug timing** — the `debug::time` instrumentation.
- **Workspace crates** — `ossido` (runtime lib), `ossido_cli` (CLI, binary `ossido`), `ossido_macros`, `ossido_internal`.
