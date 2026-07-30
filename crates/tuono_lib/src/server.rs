use axum::routing::{Router, get, post};
use ssr_rs::Ssr;
use tower_http::services::ServeDir;
use tuono_internal::config::Config;
use tuono_internal::log::{self, Level};

use crate::catch_all::catch_all;
use crate::config::GLOBAL_CONFIG;
use crate::env::load_env_vars;
use crate::manifest::load_manifest;
use crate::mode::{GLOBAL_MODE, Mode};
use crate::services::browser_logs::browser_logs;
use crate::services::logger::LoggerLayer;
use crate::vite_reverse_proxy::vite_reverse_proxy;
use crate::vite_websocket_proxy::vite_websocket_proxy;

const DEV_PUBLIC_DIR: &str = "public";
const PROD_PUBLIC_DIR: &str = "out/client";

pub fn tuono_internal_init_v8_platform() {
    Ssr::create_platform();
}

#[derive(Debug)]
pub struct Server {
    router: Router,
    mode: Mode,
    pub listener: tokio::net::TcpListener,
    pub address: String,
    pub origin: Option<String>,
}

impl Server {
    fn display_start_message(&self) {
        // In development the CLI prints the intro banner (wordmark, address,
        // routes); the server stays quiet to avoid duplicating it.
        if self.mode != Mode::Prod {
            return;
        }

        // Format the server address as a valid URL so that it becomes clickable
        // in the CLI. @see https://github.com/tuono-labs/tuono/issues/460
        let server_base_url = format!("http://{}", self.address);

        // Routed through the logger so it honours the configured format (e.g.
        // json for GCP), unlike the dev intro banner.
        log::backend(
            Level::Info,
            format!(
                "⚡ Tuono v{} ready at {server_base_url}",
                env!("CARGO_PKG_VERSION")
            ),
        );
        if let Some(origin) = &self.origin {
            log::backend(Level::Info, format!("Origin {origin}"));
        }
    }

    pub async fn init(router: Router, mode: Mode) -> Server {
        let config = Config::get().expect("[SERVER] Failed to load config");

        // Respect `NO_COLOR` and pick the output style before anything is logged.
        log::honor_no_color();
        log::set_format(config.logging.format);
        // `DEBUG=1` (or `DEBUG=true`) turns on per-request lifecycle tracing.
        log::set_debug(matches!(
            std::env::var("DEBUG").as_deref(),
            Ok("1") | Ok("true")
        ));

        let _ = GLOBAL_MODE.set(mode);
        let _ = GLOBAL_CONFIG.set(config.clone());

        if mode == Mode::Dev {
            // Capture panic locations/backtraces so a handler panic can be
            // surfaced in the client dev error overlay.
            crate::server_error::install_dev_panic_hook();
        }

        if mode == Mode::Prod
            && let Err(err) = load_manifest()
        {
            log::backend(Level::Error, format!("Failed to load vite manifest: {err}"));
        }

        let server_address = format!("{}:{}", config.server.host, config.server.port);

        unsafe {
            // This function is unsafe because it modifies the OS env variables
            // which is not thread-safe.
            // However, we are using it in a controlled environment which hasn't
            // spawned any threads yet.
            load_env_vars(mode);
        }

        let listener = match tokio::net::TcpListener::bind(&server_address).await {
            Ok(listener) => listener,
            Err(error) => {
                log::backend(
                    Level::Error,
                    format!(
                        "Failed to bind to {server_address} — is the port already in use? ({error})"
                    ),
                );
                std::process::exit(1);
            }
        };

        Server {
            router,
            mode,
            address: server_address.clone(),
            origin: config.server.origin.clone(),
            listener,
        }
    }

    pub async fn start(self) {
        self.display_start_message();

        if self.mode == Mode::Dev {
            let router = self
                .router
                .to_owned()
                .layer(LoggerLayer::new())
                .route("/__tuono/logs", post(browser_logs))
                .route("/vite-server/", get(vite_websocket_proxy))
                .route("/vite-server/{*path}", get(vite_reverse_proxy))
                .fallback_service(
                    ServeDir::new(DEV_PUBLIC_DIR)
                        .fallback(get(catch_all).layer(LoggerLayer::new())),
                );

            axum::serve(self.listener, router)
                .await
                .expect("Failed to serve development server");
        } else {
            let router = self
                .router
                .to_owned()
                .layer(LoggerLayer::new())
                .fallback_service(
                    ServeDir::new(PROD_PUBLIC_DIR)
                        .fallback(get(catch_all).layer(LoggerLayer::new())),
                );

            axum::serve(self.listener, router)
                .await
                .expect("Failed to serve production server");
        }
    }
}
