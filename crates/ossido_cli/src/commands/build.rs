use std::io::IsTerminal;
use std::path::{Path, PathBuf};
use std::thread::sleep;
use std::time::{Duration, Instant};

use colored::Colorize;
use fs_extra::dir::{CopyOptions, copy};
use ossido_internal::config::OutputMode;
use spinners::{Spinner, Spinners};
use tracing::{error, trace};

use crate::mode::Mode;
use crate::source_builder::SourceBuilder;

fn exit_gracefully_with_error(msg: &str) -> ! {
    error!(msg);
    std::process::exit(1);
}

pub struct BuildOptions {
    /// `Some(true)` for `--static`, `Some(false)` for `--server`, `None` to
    /// defer to the config's `output`.
    pub ssg_override: Option<bool>,
    pub no_js_emit: bool,
    /// Skip the `cargo build --release` of the server (`--no-cargo`).
    pub no_cargo: bool,
    /// Stream the underlying tools' output (vite, cargo, hooks) instead of
    /// collapsing each into a checklist line.
    pub verbose: bool,
}

/// One line of the build checklist.
///
/// Quiet mode animates a spinner and persists `✔ label  time`. Verbose mode
/// prints the label up front instead: the child output streamed underneath
/// would otherwise tear the spinner line apart. Without a terminal (CI, piped
/// output) there is no spinner either, just the finished line.
struct Step {
    label: &'static str,
    spinner: Option<Spinner>,
    started: Instant,
}

impl Step {
    fn start(label: &'static str, verbose: bool) -> Self {
        let spinner = if verbose {
            println!("{} {label}", "›".dimmed());
            None
        } else if std::io::stderr().is_terminal() {
            Some(Spinner::new(Spinners::Dots, label.into()))
        } else {
            None
        };

        Self {
            label,
            spinner,
            started: Instant::now(),
        }
    }

    fn done(mut self) {
        let line = format!(
            "{} {}",
            self.label,
            format_elapsed(self.started.elapsed()).dimmed()
        );
        let tick = "✔".green().to_string();
        match self.spinner.take() {
            Some(mut spinner) => spinner.stop_and_persist(&tick, line),
            None => println!("{tick} {line}"),
        }
    }

    /// Mark the step failed and exit, printing `msg` (which may carry the
    /// captured output of the failing tool) below it.
    fn fail(&mut self, msg: &str) -> ! {
        let line = format!("{} {}", "✘".red(), self.label);
        match self.spinner.take() {
            Some(mut spinner) => spinner.stop_with_message(line),
            None => println!("{line}"),
        }
        exit_gracefully_with_error(msg)
    }
}

fn format_elapsed(elapsed: Duration) -> String {
    if elapsed < Duration::from_secs(1) {
        format!("{}ms", elapsed.as_millis())
    } else {
        format!("{:.1}s", elapsed.as_secs_f64())
    }
}

/// Print a build hook's captured logs, indented under the checklist.
fn print_hook_logs(logs: &str) {
    for line in logs.lines().filter(|line| !line.trim().is_empty()) {
        println!("  {}", line.dimmed());
    }
}

/// Build the project: the React client + server bundles, then either the SSR
/// server binary (`cargo build --release`) or a static export.
///
/// Each stage is a checklist line; the route tree and emitted files are
/// printed once everything has finished.
pub fn build(mut source_builder: SourceBuilder, options: BuildOptions) {
    let BuildOptions {
        ssg_override,
        no_js_emit,
        no_cargo,
        verbose,
    } = options;

    println!("Building for production...\n");

    let mut step = Step::start("Scaffolding project", verbose);
    if let Err(err) = source_builder.base_build() {
        step.fail(&err.to_string());
    }
    step.done();

    let mut step = Step::start("Generating types", verbose);
    if let Err(err) = source_builder.generate_typescript_file() {
        step.fail(&err.to_string());
    }
    step.done();

    if no_js_emit {
        println!("Rust build successfully finished");
        std::process::exit(0);
    }

    let mut app = source_builder.app;

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

    app.check_server_availability(Mode::Prod);

    // `prebuild` hook, before any build work. Runs for both output modes; the
    // config is already transpiled (by `build_ossido_config` above) so the hook
    // is reachable via `loadConfig`. No checklist line of its own: the bin
    // no-ops for an undefined hook, so only its logs (if any) are shown.
    match app.run_build_hook("prebuild", ssg, verbose) {
        Ok(logs) => print_hook_logs(&logs),
        Err(msg) => exit_gracefully_with_error(&msg),
    }

    let mut step = Step::start("Building app", verbose);
    let bundle_summary = app
        .build_react_prod(ssg)
        .unwrap_or_else(|msg| step.fail(&msg));
    step.done();

    // The SSR server is the deliverable in server mode, so compile it in release.
    // A static export only needs the (debug) server transiently, below.
    let mut server_binary = None;
    if !ssg && !no_cargo {
        let mut step = Step::start("Compiling server", verbose);
        server_binary = app
            .build_rust_server_release(verbose)
            .unwrap_or_else(|msg| step.fail(&msg));
        step.done();
    }

    if ssg {
        let mut step = Step::start("Generating static site", verbose);

        let static_dir = PathBuf::from("out/static");

        if static_dir.is_dir() {
            std::fs::remove_dir_all(&static_dir)
                .unwrap_or_else(|_| step.fail("Failed to clear the out/static folder"));
        }

        std::fs::create_dir(&static_dir)
            .unwrap_or_else(|_| step.fail("Failed to create static output dir"));

        copy(
            "./out/client",
            &static_dir,
            &CopyOptions::new().overwrite(true).content_only(true),
        )
        .unwrap_or_else(|_| step.fail("Failed to clone assets into static output folder"));

        // Compile the server first so the readiness poll below waits only for
        // the built binary to boot — not for a cold compile, which on Windows/CI
        // can exceed SERVER_READY_TIMEOUT and get the process killed mid-build.
        if let Err(msg) = app.build_rust_server(verbose) {
            step.fail(&msg);
        }

        // Tell the server to render pages buffered (react-dom/static `prerender`)
        // rather than streamed, so each captured file is a clean, fully-settled
        // snapshot that hydrates without a mismatch. The spawned `cargo run`
        // inherits this env.
        // SAFETY: single-threaded at this point in the build; no other thread is
        // reading the environment concurrently.
        unsafe { std::env::set_var("OSSIDO_STATIC_EXPORT", "1") };

        // Start the server
        #[allow(clippy::zombie_processes)]
        let mut rust_server = app.run_rust_server();

        let mut exit_and_shut_server = |msg: &str| -> ! {
            _ = rust_server.kill();
            step.fail(msg)
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

        // Use the configured server URL (host/port or `origin`) rather than a
        // hardcoded `localhost:3000`, so SSG works for any `server.port`.
        let base_url = server_url.trim_end_matches('/');
        for route in app.route_map.values() {
            if let Err(msg) = route.save_ssg_file(&reqwest_client, base_url) {
                exit_and_shut_server(&msg);
            }
        }

        // Close server
        let _ = rust_server.kill();

        step.done();
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
    match app.run_build_hook("postbuild", ssg, verbose) {
        Ok(logs) => print_hook_logs(&logs),
        Err(msg) => exit_gracefully_with_error(&msg),
    }

    // `ossido build` always prints the route tree (the dev-only `logging.routeTree`
    // option does not apply here).
    crate::route_tree::print_route_tree(&app);

    print_files(&bundle_summary, server_binary.as_deref(), ssg);
}

/// The emitted files: the bundle-size table from the JS build, plus where the
/// deployable output lives (the server binary, or the static export).
fn print_files(bundle_summary: &str, server_binary: Option<&Path>, ssg: bool) {
    println!("{}", "Files".bold());

    let bundle_summary = bundle_summary.trim_matches('\n');
    if !bundle_summary.is_empty() {
        println!("{bundle_summary}");
    }

    if let Some(binary) = server_binary {
        // Relative to the project when it lives inside it (the usual
        // `target/release/<name>`); a shared CARGO_TARGET_DIR stays absolute.
        let shown = std::env::current_dir()
            .ok()
            .and_then(|cwd| binary.strip_prefix(cwd).ok().map(Path::to_path_buf))
            .unwrap_or_else(|| binary.to_path_buf());
        let size = std::fs::metadata(binary)
            .map(|meta| format!(" ({:.1} MB)", meta.len() as f64 / 1_000_000.0))
            .unwrap_or_default();
        println!(
            "\n  {} {}{}",
            "Server binary".dimmed(),
            shown.display().to_string().cyan(),
            size.dimmed()
        );
    } else if ssg {
        println!("\n  {} {}", "Static site".dimmed(), "out/static".cyan());
    }
}
