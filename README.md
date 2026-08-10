<div align="center">
  <a href="https://ossido.dev">
    <img src="https://raw.githubusercontent.com/ossido-labs/ossido/main/assets/header.png" alt="Ossido" width="100%">
  </a>

  <p><strong>The full-stack React framework powered by a Rust backend — built for usability and performance.</strong></p>

  <p>
    <a href="https://crates.io/crates/ossido_cli"><img src="https://img.shields.io/crates/v/ossido_cli?logo=rust&label=crates.io&color=E43717" alt="crates.io version"></a>
    <a href="https://www.npmjs.com/package/@ossido-labs/ossido"><img src="https://img.shields.io/npm/v/@ossido-labs/ossido?logo=npm&label=npm&color=CB3837" alt="npm version"></a>
    <a href="https://github.com/ossido-labs/ossido/actions/workflows/rust-ci.yml"><img src="https://github.com/ossido-labs/ossido/actions/workflows/rust-ci.yml/badge.svg" alt="Rust CI"></a>
    <a href="https://github.com/ossido-labs/ossido/actions/workflows/typescript-ci.yml"><img src="https://github.com/ossido-labs/ossido/actions/workflows/typescript-ci.yml/badge.svg" alt="TypeScript CI"></a>
    <a href="./LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
    <a href="https://discord.com/invite/3ddKV4e83M"><img src="https://img.shields.io/discord/1536194582889627658?style=flat" alt="Discord"></a>
  </p>

  <p>
    <a href="https://ossido.dev">Documentation</a> ·
    <a href="https://discord.com/invite/3ddKV4e83M">Discord</a> ·
    <a href="https://ossido.dev/documentation/contributing">Contributing</a>
  </p>
</div>

---

Ossido is a full-stack web framework for building React applications with a Rust backend. If you have
experience with [Next.js](https://nextjs.org/), you will feel right at home.

> ### **🚨 This project is still in early development. Please report any issues you find. 🚨**

> **Ossido is the successor to [Tuono](https://github.com/tuono-labs/tuono).** It began as a fork of
> the (now unmaintained) Tuono framework and carries its development forward.
>
> The name is a nod to its origin: _Tuono_ is Italian for "thunder", and _Ossido_ is Italian for
> "oxide" — a rust-themed wink to the Rust core that powers the backend.

## Features

- 🟦 **Native TypeScript** — first-class TypeScript support out of the box
- 🌐 **File-based routing** — Next.js-like routing conventions
- 🍭 **CSS/SCSS modules** — scoped styling with zero configuration
- 🧬 **Server-side rendering** — fast, SEO-friendly SSR
- 🔥 **Hot module reload** — instant feedback during development
- ⚡ **Rust backend** — a high-performance core built on Rust

## Installation

Available on macOS, Linux and Windows.

```sh
cargo install ossido_cli
```

## Getting started

Create a new project:

```sh
ossido new [PROJECT_NAME]
```

> Pass the `--template` (or `-t`) flag to start from an existing
> [template](https://github.com/ossido-labs/ossido/tree/main/examples).

Install the dependencies with your favourite JavaScript package manager (e.g. `npm install`), then
start the development server:

```sh
ossido dev
```

## Documentation

Full documentation is available at [ossido.dev](https://ossido.dev/).

## Contributing

Contributions, ideas and suggestions are welcome and encouraged. See the
[Contributing guide](https://ossido.dev/documentation/contributing) to get started.

## License

Licensed under the [MIT License](./LICENSE.md).
