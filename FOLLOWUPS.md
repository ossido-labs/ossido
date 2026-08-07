# Follow-ups

## Fast Refresh guardrail (`ossido-eslint-plugin`) — done

Background: React Fast Refresh only hot-updates a module when **every** export is
a component (primitive constant exports are tolerated via `allowConstantExport`).
A co-located non-component export (object / function / class) turns every edit to
that file into a full page reload — and on an SSR route, that reload refetches the
route's server data. The default export being the component doesn't help: the
boundary is the whole module. Clean, component-only pages already get proper,
state-preserving Fast Refresh (verified live).

Shipped: `packages/ossido-eslint-plugin` wraps `eslint-plugin-react-refresh`'s
`only-export-components` rule for oxlint (`jsPlugins`), wired into the root
`.oxlintrc.json` at `warn` with `allowConstantExport: true`.

Resolved items:

- [x] **Triaged the 5 dogfood findings.** Repo-wide react-refresh findings are now 0.
  - `RouterContext.tsx`: moved the `RouterContextProvider` component to its own
    `RouterContextProvider.tsx`; the file now exports only the context, hook, and
    `getInitialLocation` (2 importers updated).
  - `OssidoContext.tsx`: extracted the context object + hooks to `ossido-context.ts`;
    the `.tsx` keeps only the Provider (2 importers updated).
  - `dynamic.tsx`: file-level `eslint-disable` — it's a dynamic-import HOC factory
    (its only export returns a component), with no top-level component to lose
    state for.
- [x] **Added the guardrail to the scaffold templates.** All four examples
      (`ossido-app`, `ossido-tutorial`, `with-mdx`, `with-tailwind`) now ship a
      minimal `.oxlintrc.json` (the `react-refresh/only-export-components` rule via
      the plugin), plus `oxlint` + `ossido-eslint-plugin` devDeps and a `lint`
      script — so newly-scaffolded projects get the guardrail by default.
- [x] **Ignored stale `.tuono` build output in lint** — added `**/.tuono/**` to the
      root `.oxlintrc.json` `ignorePatterns`.

## HMR containment (partial — static route files only)

Implemented dev-only HMR containment in the generated route tree
(`import.meta.hot.accept`) so a bad-boundary edit to a **statically-imported**
route file (layout / loading / error / not-found) swaps the component in place
instead of full-reloading. **Pages are not contained**: they're lazy
(dynamic `import()`), and vite's `hot.accept(deps)` only wires up statically
imported deps — the page entries in the generated block are inert (harmless, no
warnings, future-proof). Fully containing bad-boundary pages would need eager
static page imports in dev (dev-startup cost + dev/prod divergence). This is left
as-is by design: containment only yields a remount, not proper state-preserving
HMR, so the lint guardrail above is the preferred fix — keep page files
component-only and they Fast-Refresh cleanly.
