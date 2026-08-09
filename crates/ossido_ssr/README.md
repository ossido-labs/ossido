# ossido_ssr

Server-side rendering with the [V8](https://v8.dev/) engine — the SSR backbone
for [Ossido](https://ossido.dev).

It embeds V8 (via [rusty_v8](https://github.com/denoland/rusty_v8)) to evaluate a
built JS bundle and return the rendered HTML string, with an opt-in streaming
render path. It ships the ICU data (`icudtl.dat`) needed for `Intl` support.

> This crate is vendored from the (now stagnant) upstream
> [`ssr_rs`](https://crates.io/crates/ssr_rs) crate by
> [Valerio Ageno](https://github.com/Valerioageno), renamed and maintained as an
> internal part of Ossido; the public API is unchanged.

## Example

```rust,no_run
use ossido_ssr::Ssr;
use std::fs::read_to_string;

fn main() {
    Ssr::create_platform();

    let source = read_to_string("./path/to/build.js").unwrap();
    let mut js = Ssr::from(source, "entryPoint").unwrap();
    let html = js.render_to_string(None).unwrap();

    assert_eq!(html, "<!doctype html><html>...</html>".to_string());
}
```

Because rusty_v8 does not implement the V8 Locker API, an `Ssr` instance must not
be shared across threads — use one isolate per thread (e.g. `thread_local!`).

Check [ossido](https://github.com/ossido-labs/ossido) for more.

## License & credits

Originally authored by Valerio Ageno as [`ssr_rs`](https://github.com/Valerioageno/ssr-rs)
(licensed `MIT OR Apache-2.0`). This derivative is distributed under the MIT
license; see [`LICENSE`](./LICENSE), which retains the original copyright notice.
