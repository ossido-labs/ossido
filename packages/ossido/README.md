# ossido

The core JavaScript runtime for [Ossido](https://ossido.dev) — the React/Rust
full-stack framework.

This package is installed into every scaffolded Ossido app. It provides the
client entry/hydration, the server-side rendering entry, the build tooling, and
the config types the framework relies on. You normally don't import it directly
— the [`ossido` CLI](https://github.com/ossido-labs/ossido) and the framework's
generated code wire it up for you.

## Getting started

Create a new project with the CLI (installs this package for you):

```sh
ossido new [PROJECT_NAME]
```

## Entry points

- `ossido` — framework primitives (e.g. `Link`) used in app code
- `ossido/config` — `OssidoConfig` type and config helpers
- `ossido/client` / `ossido/hydration` — client bootstrap + hydration
- `ossido/ssr` — server-side rendering entry
- `ossido/build` / `ossido/build-client` — build pipeline

Check [ossido](https://github.com/ossido-labs/ossido) for more.
