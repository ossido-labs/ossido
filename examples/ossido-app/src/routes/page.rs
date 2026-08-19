use ossido::{Logger, Props, Request, get_env, handler};

#[Props]
struct MyResponse {
    subtitle: String,
}

#[handler]
async fn get_server_side_props(_req: Request, logger: Logger) -> MyResponse {
    // Read a server-only (private) env var in Rust. Never exposed to the client.
    let database_url = get_env!(DATABASE_URL);
    // Optional field collapsed to a concrete `bool` via the fallback form.
    let analytics: bool = get_env!(analytics_enabled, false);
    logger.info(&format!(
        "Serving the index page (db: {database_url}, analytics: {analytics})"
    ));
    MyResponse {
        subtitle: "The react / rust fullstack framework".into(),
    }
}
