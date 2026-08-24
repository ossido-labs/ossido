# with-opentelemetry

Ossido has built-in, opt-in OpenTelemetry support (traces + logs, exported as
OTLP over http/protobuf). It is configured entirely through the standard
`OTEL_*` environment variables — no ossido config needed. Point it at any
OTLP-HTTP collector (Jaeger, Grafana, Honeycomb, `otel-tui`, …):

```sh
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 ossido dev
```

You get, automatically:

- A server span per request (`GET /api/pokemons/{name}`) with the HTTP
  semantic conventions, continuing an incoming W3C `traceparent`.
- A child span per handler, plus SSR spans (`ssr.queue_wait`,
  `ssr.render_job`, `ssr.v8_compile`, `ssr.render`).
- Every framework/`logger` log (and forwarded browser log) as an OTLP log
  record, correlated with the request's trace. Console output is unchanged.

Add your own spans with the re-exported `ossido::tracing` API:

- `#[tracing::instrument]` on any function — needs a direct `tracing`
  dependency (see `Cargo.toml`); demonstrated in
  [`src/routes/api/pokemons/[name].rs`](src/routes/api/pokemons/%5Bname%5D.rs).
- `ossido::tracing::info_span!` / `info!` — no extra dependency;
  demonstrated in [`src/routes/page.rs`](src/routes/page.rs).

## Supported variables

`OTEL_EXPORTER_OTLP_ENDPOINT` (+ `_TRACES_`/`_LOGS_` variants),
`OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_EXPORTER_OTLP_TIMEOUT`,
`OTEL_SDK_DISABLED`, `OTEL_SERVICE_NAME` (defaults to `ossido`),
`OTEL_RESOURCE_ATTRIBUTES`, `OTEL_TRACES_SAMPLER` (+ `_ARG`), and the
`OTEL_BSP_*`/`OTEL_BLRP_*` batch settings. Only `http/protobuf` transport is
supported (`OTEL_EXPORTER_OTLP_PROTOCOL` values other than `http/protobuf`
are ignored with a warning).

Telemetry is compiled in behind ossido's default-on `telemetry` cargo
feature; build the framework with `default-features = false` to drop the
dependency weight entirely.

## Try it

```sh
ossido new my-app --template with-opentelemetry
npm install

# any OTLP-HTTP collector works; otel-tui is a nice local one:
otel-tui &
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 ossido dev
```

Then load `/` (SSR spans) and `/api/pokemons/pikachu` (handler + custom
child span, correlated log records).
