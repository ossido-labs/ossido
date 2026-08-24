use ossido::{Logger, Props, Request, handler, tracing};

#[Props]
struct IndexProps {
    subtitle: String,
}

/// A span created with the re-exported `ossido::tracing` macros — no direct
/// `tracing` dependency needed for this style.
fn build_subtitle() -> String {
    tracing::info_span!("build_subtitle")
        .in_scope(|| "SSR pages, handlers and logs — all traced".to_string())
}

#[handler]
async fn index(_req: Request, logger: Logger) -> IndexProps {
    let subtitle = build_subtitle();
    logger.info("serving the index page");
    IndexProps { subtitle }
}
