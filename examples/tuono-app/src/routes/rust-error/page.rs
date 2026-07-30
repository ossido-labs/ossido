use tuono_lib::{handler, Request, Response};

/// Dev-only smoke test: this handler always panics so we can confirm an
/// unexpected Rust error surfaces in the development error overlay — both on a
/// full-page SSR load and on client-side navigation to `/rust-error`.
#[handler]
async fn rust_error(_req: Request) -> Response {
    panic!("Boom! This panic was raised inside a Rust route handler");
}
