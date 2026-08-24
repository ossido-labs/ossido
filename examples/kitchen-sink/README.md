# Kitchen sink

The everything-example: a small Todo app that touches most of ossido's
server-side surface in one place.

```sh
ossido new my-app --template kitchen-sink
```

| Feature                                                                                           | Where                                                      |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Postgres via [sqlx](https://github.com/launchbadge/sqlx) (pool in app state, embedded migrations) | `src/app.rs`, `migrations/`, `docker-compose.yml`          |
| Server-side props from the database                                                               | `src/routes/page.rs`                                       |
| Server actions — `useActionState` form + imperative calls                                         | `src/routes/actions.rs`, `src/components/TodoApp.tsx`      |
| Dynamic route with a typed param                                                                  | `src/routes/todos/[id]/page.rs`                            |
| JSON API route                                                                                    | `src/routes/api/todos.rs`                                  |
| Typed environment (`#[ossido::Environment]`, public + server-only)                                | `src/env.rs`, `.env`                                       |
| Site-wide and API-scoped middleware                                                               | `src/routes/middleware.rs`, `src/routes/api/middleware.rs` |
| Tailwind CSS v4 (vite plugin + theme tokens)                                                      | `ossido.config.ts`, `src/styles/global.css`                |
| OpenTelemetry traces + logs (opt-in)                                                              | `src/routes/todos/[id]/page.rs`, below                     |
| Database spans (OTel semconv, per query)                                                          | `src/db.rs`, below                                         |

## Running

```sh
docker compose up -d   # postgres + a local OpenTelemetry viewer
npm install
ossido dev
```

The database is migrated automatically on startup. To reset it:
`docker compose down -v`.

## OpenTelemetry

Ossido has built-in, opt-in OpenTelemetry support (traces + logs, exported as
OTLP over http/protobuf). It is configured entirely through the standard
`OTEL_*` environment variables — no ossido config needed. The compose file
includes [otel-desktop-viewer](https://github.com/CtrlSpice/otel-desktop-viewer),
a zero-config local trace viewer:

```sh
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 ossido dev
```

Then browse the app and watch the traces at <http://localhost:8000>. Any
other OTLP-HTTP collector (Jaeger, Grafana, Honeycomb, …) works the same way.

You get, automatically:

- A server span per request (`GET /todos/{id}`) with the HTTP semantic
  conventions, continuing an incoming W3C `traceparent`.
- A child span per handler/action, plus SSR spans (`ssr.queue_wait`,
  `ssr.render_job`, `ssr.v8_compile`, `ssr.render`).
- Every framework/`logger` log (and forwarded browser log) as an OTLP log
  record, correlated with the request's trace. Console output is unchanged.

Add your own spans with the re-exported `ossido::tracing` API — see
`find_todo` in [`src/routes/todos/[id]/page.rs`](src/routes/todos/%5Bid%5D/page.rs).
(`#[tracing::instrument]` needs a direct `tracing` dependency; the
`ossido::tracing` macros do not.)

### Database spans

The app state's `db` field is not a bare `PgPool` but [`Db`](src/db.rs) — a
thin wrapper implementing `sqlx::Executor` that runs every query inside a span
following the OTel
[database semantic conventions](https://opentelemetry.io/docs/specs/semconv/database/database-spans/).
Handlers just write plain sqlx (`sqlx::query_as(..).fetch_all(&db)`) —
instrumentation is automatic. Load the index, add/toggle/delete a todo, or hit
`/api/todos`, and the trace shows the full nesting:

```text
GET /                       (server span)
└── list_todos              (handler span)
    └── SELECT todos        (db span)
```

Each `SELECT todos` / `INSERT todos` / `UPDATE todos` / `DELETE todos` span
carries `db.system.name`, `db.operation.name`, `db.collection.name`,
`db.query.text`, and `db.response.returned_rows` (recorded as an `i64` — a
smaller integer type would export as a _string_ attribute). A failed query
marks the span `ERROR` and emits a trace-correlated error log. The span name
and attributes are derived from the SQL itself, so new queries need no extra
code.

Supported variables: `OTEL_EXPORTER_OTLP_ENDPOINT` (+ `_TRACES_`/`_LOGS_`
variants), `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_EXPORTER_OTLP_TIMEOUT`,
`OTEL_SDK_DISABLED`, `OTEL_SERVICE_NAME` (defaults to `ossido`),
`OTEL_RESOURCE_ATTRIBUTES`, `OTEL_TRACES_SAMPLER` (+ `_ARG`), and the
`OTEL_BSP_*`/`OTEL_BLRP_*` batch settings. Only `http/protobuf` transport is
supported (`OTEL_EXPORTER_OTLP_PROTOCOL` values other than `http/protobuf`
are ignored with a warning).
