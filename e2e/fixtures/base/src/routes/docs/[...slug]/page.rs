use ossido::{Props, Request, Response, StaticPaths, Type, handler, static_paths};

#[Type]
struct DocResponse {
    slug: String,
}

#[handler]
async fn get_server_side_props(req: Request) -> Response {
    let slug = req.params.get("slug").cloned().unwrap_or_default();
    Response::Props(Props::new(DocResponse { slug }))
}

#[static_paths]
async fn static_paths(paths: &mut StaticPaths) {
    // A catch-all slot fills multiple URL segments.
    paths.register(|params| {
        params.catchall("slug", ["getting-started", "install"]);
    });
    paths.register(|params| {
        params.catchall("slug", ["guides", "advanced", "ssg"]);
    });
}
