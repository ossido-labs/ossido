# ossido_cli

The command-line interface for [Ossido](https://ossido.dev) — the React/Rust
full-stack framework.

The crate is published as `ossido_cli`, but the installed command is `ossido`.

## Installation

Available on macOS, Linux and Windows.

```sh
cargo install ossido_cli
```

## Commands

```sh
ossido new [FOLDER_NAME]   # scaffold a new project (interactive wizard)
ossido dev                 # start the development environment
ossido build               # build the production assets
```

`ossido new` accepts `--template`, `--tailwind`, `--mdx`, `--output`, `--alias`
and `-y/--yes`; `ossido build` accepts `--static` (SSG), `--server` (SSR server)
and `--no-js-emit`. Run `ossido <command> --help` for the full list.

Check [ossido](https://github.com/ossido-labs/ossido) for more.
