use tracing::error;
use tracing_subscriber::EnvFilter;
use ossido_cli::cli::app;

fn main() {
    // Respect `NO_COLOR` before any coloured output is produced.
    ossido_internal::log::honor_no_color();

    tracing_subscriber::fmt()
        // Time not needed since the execution is synchronous
        .without_time()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    if let Err(e) = app() {
        // Generic error.
        // Recoverable errors should be managed locally
        error!("Failed to run the ossido CLI: {}", e);
        std::process::exit(1);
    }
}
