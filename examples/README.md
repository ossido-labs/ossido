# Ossido examples

This folder includes all the official ossido starters.

To simply scaffold the base project run in your terminal:

```sh
ossido new [NAME]
```

You can install any example included in this folder by just using the `--template` flag:

```sh
ossido new [NAME] --template [TEMPLATE]
```

`[TEMPLATE]` is the folder name.

| Template             | What it shows                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ossido-app`         | The default starter: routing, SSR props, actions, typed env                                                                                 |
| `ossido-tutorial`    | The app built by the [tutorial](https://ossido.dev)                                                                                         |
| `kitchen-sink`       | The everything-example: a Todo app with sqlx + Postgres (docker-compose), server actions, typed env, middleware, Tailwind and OpenTelemetry |
| `with-sqlx`          | Minimal sqlx + SQLite: a pool in app state, one page, one action                                                                            |
| `with-websockets`    | Typed WebSocket events as a small broadcast chat                                                                                            |
| `with-opentelemetry` | The built-in OTel traces + logs, opted in via `OTEL_*` env vars                                                                             |
| `with-tailwind`      | Tailwind CSS setup                                                                                                                          |
| `with-mdx`           | MDX pages                                                                                                                                   |
