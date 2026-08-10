use std::path::{Path, PathBuf};
use std::thread::sleep;
use std::time::{Duration, Instant};

use colored::Colorize;
use fs_extra::dir::{CopyOptions, copy};
use ossido_internal::config::OutputMode;
use spinners::{Spinner, Spinners};
use tracing::{error, trace};

use crate::app::App;
use crate::mode::Mode;

fn exit_gracefully_with_error(msg: &str) -> ! {
    error!(msg);
    std::process::exit(1);
}

/// Statically generate the site instead of building the SSR server.
///
/// `ssg_override` is the CLI intent: `Some(true)` for `--static`, `Some(false)`
/// for `--server`, `None` to defer to the config's `output`.
pub fn build(mut app: App, ssg_override: Option<bool>, no_js_emit: bool) {
    if no_js_emit {
        println!("Rust build successfully finished");
        std::process::exit(0);
    }

    app.build_ossido_config()
        .unwrap_or_else(|_| exit_gracefully_with_error("Failed to build ossido.config.ts"));

    // The flag wins; otherwise the config's `output` decides. The config is only
    // available after `build_ossido_config`, so this is resolved here rather than
    // in the CLI layer.
    let ssg = ssg_override.unwrap_or_else(|| {
        app.config
            .as_ref()
            .map(|config| config.output == OutputMode::Static)
            .unwrap_or(false)
    });

    if ssg {
        // Dynamic routes are statically generated from their `#[static_paths]`
        // enumerator; abort only for those that declare none.
        let missing = app.dynamic_routes_without_static_paths();
        if !missing.is_empty() {
            println!(
                "Cannot statically generate these dynamic routes — add a #[static_paths] function to each page.rs:\n  {}",
                missing.join("\n  ")
            );
            std::process::exit(1);
        }
    }

    // `prebuild` hook, before any build work. Runs for both output modes; the
    // config is already transpiled (by `build_ossido_config` above) so the hook
    // is reachable via `loadConfig`.
    if !app.run_build_hook("prebuild", ssg) {
        exit_gracefully_with_error("prebuild hook failed");
    }

    let build_started = Instant::now();
    let mut app_build_spinner = Spinner::new(Spinners::Dots, "Building app...".into());

    app.check_server_availability(Mode::Prod);

    let build_output = app.build_react_prod(ssg);

    // Persist a checklist-style line matching `ossido dev`'s "✔ Ready in Xms".
    app_build_spinner.stop_and_persist(
        &"✔".green().bold().to_string(),
        format!("Built in {}ms", build_started.elapsed().as_millis())
            .green()
            .bold()
            .to_string(),
    );

    // The build script's stdout carries the bundle-size summary (vite itself
    // logs at `error` level) — print it under the tick, above the route tree.
    let build_output = build_output.trim_end();
    if !build_output.is_empty() {
        println!("{build_output}");
    }

    // `ossido build` always prints the route tree (the dev-only `logging.routeTree`
    // option does not apply here).
    crate::route_tree::print_route_tree(&app);

    if ssg {
        let ssg_started = Instant::now();
        let mut app_build_static_spinner =
            Spinner::new(Spinners::Dots, "Static site generation".into());

        let mut exit_gracefully_with_error = |msg: &str| -> ! {
            app_build_static_spinner.stop_with_message("\u{274C} Build failed\n".into());
            exit_gracefully_with_error(msg)
        };

        let static_dir = PathBuf::from("out/static");

        if static_dir.is_dir() {
            std::fs::remove_dir_all(&static_dir).unwrap_or_else(|_| {
                exit_gracefully_with_error("Failed to clear the out/static folder")
            });
        }

        std::fs::create_dir(&static_dir)
            .unwrap_or_else(|_| exit_gracefully_with_error("Failed to create static output dir"));

        copy(
            "./out/client",
            static_dir,
            &CopyOptions::new().overwrite(true).content_only(true),
        )
        .unwrap_or_else(|_| {
            exit_gracefully_with_error("Failed to clone assets into static output folder")
        });

        // Start the server
        #[allow(clippy::zombie_processes)]
        let mut rust_server = app.run_rust_server();

        let mut exit_and_shut_server = |msg: &str| -> ! {
            _ = rust_server.kill();
            exit_gracefully_with_error(msg)
        };

        let reqwest_client = reqwest::blocking::Client::builder()
            .user_agent("")
            .build()
            .unwrap_or_else(|_| exit_and_shut_server("Failed to build reqwest client"));

        // Wait for the server, bounded: a server that never comes up (port in
        // use, panic on boot) should fail the build with a clear error instead
        // of hanging forever. Poll fast at first (the server usually boots in
        // well under a second), backing off to 1s.
        const SERVER_READY_TIMEOUT: Duration = Duration::from_secs(60);
        let config = app.config.as_ref().unwrap();
        let server_url = match &config.server.origin {
            Some(origin) => origin.clone(),
            None => format!("http://{}:{}", config.server.host, config.server.port),
        };

        let wait_started = std::time::Instant::now();
        let mut poll_interval = Duration::from_millis(100);
        loop {
            trace!("Checking server availability");

            if reqwest_client.get(&server_url).send().is_ok() {
                break;
            }

            if wait_started.elapsed() >= SERVER_READY_TIMEOUT {
                exit_and_shut_server(&format!(
                    "Server did not become ready at {server_url} within {}s — cannot statically generate",
                    SERVER_READY_TIMEOUT.as_secs()
                ));
            }

            trace!("Server not ready yet. Sleeping for {poll_interval:?}");
            sleep(poll_interval);
            poll_interval = (poll_interval * 2).min(Duration::from_secs(1));
        }

        trace!("Server is ready, starting static site generation");

        for route in app.route_map.values() {
            if let Err(msg) = route.save_ssg_file(&reqwest_client) {
                exit_and_shut_server(&msg);
            }
        }

        // Close server
        let _ = rust_server.kill();

        app_build_static_spinner.stop_and_persist(
            &"✔".green().bold().to_string(),
            format!(
                "Static generation in {}ms",
                ssg_started.elapsed().as_millis()
            )
            .green()
            .bold()
            .to_string(),
        );
    }

    // Apply `.ossidoignore`: remove any emitted files matching its globs from the
    // build output. Done before the postbuild hook so the hook's `manifest`
    // reflects the final, filtered file set.
    let ignore_patterns = crate::ossidoignore::load_patterns();
    if !ignore_patterns.is_empty() {
        for dir in ["out/client", "out/server", "out/static"] {
            crate::ossidoignore::apply(Path::new(dir), &ignore_patterns);
        }
    }

    // `postbuild` hook, after all artifacts exist (the static export in
    // `out/static`, or the client + server bundles in `out`). Its `manifest` is
    // the emitted-file list of the output directory.
    if !app.run_build_hook("postbuild", ssg) {
        exit_gracefully_with_error("postbuild hook failed");
    }
}
