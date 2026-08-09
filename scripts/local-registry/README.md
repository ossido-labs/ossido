# Ossido local registry

A [Verdaccio](https://verdaccio.org/) registry for testing the workspace packages
(`ossido`, `ossido-router`, `ossido-ui`, `ossido-react-vite-plugin`) as if they
were published — including their interlinking `dependencies` — **without**
publishing to the real npm. It serves the Ossido packages from local storage and
**proxies every other package to npmjs.org** (cached locally after first fetch).

## Usage

**1. Start the registry** (leave it running in its own terminal):

```sh
bun run registry:start          # → http://localhost:4873  (web UI + API)
```

**2. Build + publish the packages** (in another terminal):

```sh
bun run registry:publish
```

Re-runnable any time you change a package — it rebuilds, unpublishes the prior
version, and republishes. It uses `bun publish`, which rewrites each
`workspace:*` dependency to the concrete version (e.g. `ossido-router: 0.1.0`)
so the interlinks resolve from the registry. (`npm publish` does **not** do this
rewrite in this workspace — hence bun.)

**3. Consume them in a test project.** Add an `.npmrc` at the project root:

```
registry=http://localhost:4873/
```

then install as usual (`npm install` / `bun install`). The Ossido packages come
from the local registry; everything else is proxied from npmjs. A project made
with `ossido new` already pins `"@ossido-labs/ossido": "0.1.0"`, so it just works.

## How it works

- **`config.yaml`** — the `ossido` / `ossido-*` package rules have **no** uplink,
  so those names are served _only_ from local storage (an unpublished one fails
  fast rather than silently resolving some unrelated package on npmjs). The
  catch-all `**` rule proxies to the `npmjs` uplink. `publish: $all` allows
  anonymous publish, so no login is needed for local dev.
- **`publish.ts`** — builds all packages, then for each publishes with `bun`.
  It writes a throwaway `.npmrc` at the repo root for the registry URL + a dummy
  auth token (Verdaccio treats an unknown token as anonymous), backing up and
  restoring any pre-existing root `.npmrc`.
- **Storage** — published tarballs + metadata live in `./storage/` (gitignored).
  It persists across restarts; delete it to reset the registry to empty.

## Notes

- Only the four public packages are published. `vite-config` (in `devtools/`) is
  `private` and a devDependency only, so consumers never fetch it.
- Not published to real npm and never will be from here — this is local-only.
