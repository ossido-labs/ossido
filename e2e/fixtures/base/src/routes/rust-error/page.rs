use tuono_lib::{handler, Request, Response};

/// A route whose Rust handler panics — the dev error overlay surfaces the panic
/// with the embedded panic-site source (no sourcemap involved). Used by the e2e
/// suite; see e2e/fixtures/base/tests/error-overlay.spec.ts.
#[handler]
async fn get_server_side_props(_req: Request) -> Response {
    panic!("This panic was raised inside a Rust route handler");
}
