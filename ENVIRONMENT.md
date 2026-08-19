# Environment Variables

Ossido lets you declare a single, typed source of truth for your app's
environment. You define an `Environment` struct in Rust; fields are parsed from
the OS environment at startup, and the ones you mark `#[public]` are exposed to
the frontend with generated TypeScript types.

The whole feature is **optional** — if you don't define an `Environment` struct,
nothing is generated and no env global is injected.

## Defining the schema

Create the struct anywhere under `src/` (convention: `src/env.rs`). Mark it with
`#[ossido::Environment]`, and mark the fields you want to expose to the browser
with `#[public]`.

```rust
// src/env.rs
#[ossido::Environment]
pub struct Environment {
    // Public — available on the client via getEnv('api_url').
    #[public]
    api_url: String,

    // Public, typed + optional — getEnv('analytics_enabled') is `boolean | null`.
    #[public]
    analytics_enabled: Option<bool>,

    // Server-only secret — never leaves the backend.
    database_url: String,
}
```

### Field rules

- **Naming** — a field maps to the env var of its upper-cased name
  (`api_url` → `API_URL`). You can also name fields in `SCREAMING_SNAKE_CASE` to
  mirror the env var directly (`DATABASE_URL: String`); the macro suppresses the
  `non_snake_case` warning, and both styles resolve to the same var.
- **Types** — `String` and any `FromStr` scalar (`u16`, `bool`, …).
- **Required vs optional** — a non-`Option` field is **required**: a missing or
  unparseable value **panics at startup** with the offending field/var name. An
  `Option<T>` field is optional (absent → `None`).
- **`#[public]`** — exposes the field to the frontend. Everything else stays
  server-only.

## Reading in Rust — `get_env!`

Read any field (public or private) with the `get_env!` macro. It returns a typed
copy of the value.

```rust
use ossido::get_env;

let db = get_env!(database_url); // -> String
let flag = get_env!(analytics_enabled); // -> Option<bool>
```

If no `Environment` struct exists, `get_env!` does not compile at the call site —
the Rust equivalent of the frontend `getEnv` throwing at runtime.

### Using env for `ApplicationState`

`.env` is loaded (and the `Environment` struct parsed) at the very top of the
generated `main`, **before** the app-state initializer runs. So you can build
`ApplicationState` utilities — a DB pool, HTTP clients, etc. — directly from env:

```rust
// src/app.rs
use ossido::get_env;

#[derive(Clone)]
pub struct ApplicationState {
    pub db: DbPool,
}

pub async fn main() -> ApplicationState {
    let db = DbPool::connect(&get_env!(database_url)).await;
    ApplicationState { db }
}
```

## Reading in the frontend — `getEnv`

Only `#[public]` fields are available. Types are generated into
`.ossido/types.ts`, so keys and value types are checked.

```ts
import { getEnv } from '@ossido-labs/ossido/env';

const apiUrl = getEnv('api_url'); //=> string
const analytics = getEnv('analytics_enabled'); //=> boolean | null
```

`getEnv` works during SSR and on the client. It **throws** if no public
environment is available (no `Environment` struct) or if the key is not a public
variable. Private fields are not accessible here — read those in Rust.

## Loading `.env` files

`.env` loading is automatic when an `Environment` struct exists. By default the
usual cascade is loaded, in order (later overrides earlier), skipping any key
already set in the real OS environment:

```
.env
.env.local
.env.[mode]          # development | production
.env.[mode].local
```

### Overriding which files are loaded

Set `env` in `ossido.config.ts` to a path or array of paths. This **replaces**
the default cascade (the listed files are loaded in order):

```ts
// ossido.config.ts
export default {
  env: ['.env.shared', '.env.secret'],
};
```

## How it works

- The `#[ossido::Environment]` macro adds serde derives, a `from_env()` parser,
  and a public-only JSON serializer.
- At build time the CLI detects the struct and generates:
  - the `@ossido-labs/ossido/env` type augmentation in `.ossido/types.ts`
    (public fields only), and
  - the wiring in `.ossido/main.rs`. A single `ossido::bootstrap(..)` call at the
    top of `main` — before app-state init — loads `.env`, parses the singleton
    (fail-fast), and registers the public JSON.
- During SSR the public JSON is embedded in the page as the
  `window.__OSSIDO_PUBLIC_ENV__` global (and mirrored onto `globalThis` for
  server rendering), which `getEnv` reads. Private fields never leave the
  server.

## Security note

Only `#[public]` fields are serialized into the SSR payload and the browser
global. Non-public fields (secrets, connection strings, API keys) stay in Rust
and are never sent to the client.
