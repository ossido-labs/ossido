use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use std::time::{Duration, Instant};

use clap::crate_version;
use colored::Colorize;
use tokio::net::TcpStream;
use tokio::task::JoinHandle;
use tokio::time::sleep;
use tracing::trace;
use ossido_internal::config::Config;
use watchexec_supervisor::command::{Command, Program};
use watchexec_supervisor::job::{Job, start_job};

#[cfg(target_os = "windows")]
const DEV_WATCH_BIN_SRC: &str = "node_modules\\.bin\\ossido-dev-watch.cmd";
#[cfg(target_os = "windows")]
const DEV_SSR_BIN_SRC: &str = "node_modules\\.bin\\ossido-dev-ssr.cmd";

#[cfg(not(target_os = "windows"))]
const DEV_WATCH_BIN_SRC: &str = "node_modules/.bin/ossido-dev-watch";
#[cfg(not(target_os = "windows"))]
const DEV_SSR_BIN_SRC: &str = "node_modules/.bin/ossido-dev-ssr";

/// Best-effort local network IP (e.g. `192.168.x.x`) for the "Network" URL.
/// Opens a UDP socket and inspects which local interface would route to a
/// public address — no packet is actually sent. Returns `None` when offline or
/// no routable interface exists.
fn local_ip() -> Option<std::net::IpAddr> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    socket.local_addr().ok().map(|addr| addr.ip())
}

/// Poll until the dev server is actually accepting TCP connections, so we don't
/// report "ready" while `cargo run` is still starting up and binding the port.
/// Bounded: gives up after a while and lets startup proceed rather than hang.
async fn wait_for_server_ready(host: &str, port: u16) {
    // `0.0.0.0` (bind-all) isn't reliably connectable; probe the loopback.
    let connect_host = if host == "0.0.0.0" { "127.0.0.1" } else { host };
    let addr = format!("{connect_host}:{port}");

    let started = Instant::now();
    let timeout = Duration::from_secs(30);
    let mut interval = Duration::from_millis(50);

    loop {
        if TcpStream::connect(&addr).await.is_ok() {
            trace!("Dev server is accepting connections at {addr}");
            return;
        }
        if started.elapsed() >= timeout {
            trace!("Dev server not reachable at {addr} after {timeout:?}; proceeding anyway");
            return;
        }
        sleep(interval).await;
        // Back off, but stay responsive so "ready" fires promptly once it binds.
        interval = (interval * 2).min(Duration::from_millis(500));
    }
}

#[derive(PartialEq, Eq, Hash, Debug)]
pub enum ProcessId {
    WatchReactSrc,
    RunRustDevServer,
    BuildRustSrc,
    BuildReactSSRSrc,
}

// This struct manages all the processes spawned by the dev server
// That are not the dev server itself
#[derive(Debug)]
pub struct ProcessManager {
    processes: HashMap<ProcessId, (Job, JoinHandle<()>)>,
}

impl ProcessManager {
    pub fn new() -> Self {
        trace!("Creating process manager");
        if !Path::new(DEV_SSR_BIN_SRC).exists() {
            eprintln!("Failed to find script to run dev watch. Please run `npm install`");
            std::process::exit(1);
        }
        let mut processes = HashMap::new();
        processes.insert(
            ProcessId::WatchReactSrc,
            start_supervisor_job(DEV_WATCH_BIN_SRC, Vec::new()),
        );

        processes.insert(
            ProcessId::RunRustDevServer,
            start_supervisor_job("cargo", vec!["run", "-q"]),
        );

        processes.insert(
            ProcessId::BuildRustSrc,
            start_supervisor_job("cargo", vec!["build", "-q"]),
        );

        processes.insert(
            ProcessId::BuildReactSSRSrc,
            start_supervisor_job(DEV_SSR_BIN_SRC, Vec::new()),
        );

        Self { processes }
    }

    pub fn start_process(&mut self, id: ProcessId) {
        trace!("start process {:?}", id);
        if let Some((job, _)) = self.processes.get(&id) {
            job.start();
        }
    }

    // Start all the processes needed for the dev server. `report` is called with
    // the label of each phase as it begins, so the caller can render a checklist
    // (tick the previous item, start the next) instead of one silent, often
    // multi-minute, spinner.
    pub async fn start_dev_processes(&mut self, mut report: impl FnMut(&str), host: &str, port: u16) {
        trace!("Starting dev processes");
        self.start_process(ProcessId::WatchReactSrc);
        self.start_process(ProcessId::BuildRustSrc);
        self.start_process(ProcessId::BuildReactSSRSrc);

        // The Rust build is the long pole on a fresh project: it compiles the
        // whole dependency tree (ossido + ossido_ssr + V8), which is why the first
        // `ossido dev` can sit here for minutes.
        report("Compiling the Ossido server");
        self.wait_for_process(ProcessId::BuildRustSrc).await;

        report("Building the frontend bundle");
        self.wait_for_process(ProcessId::BuildReactSSRSrc).await;

        // This needs to start after having built the rust and react sources.
        report("Starting the dev server");
        self.start_process(ProcessId::RunRustDevServer);

        // `cargo run` binds the port a beat after it's spawned — wait until the
        // server actually accepts connections so the caller only reports "ready"
        // once requests will succeed.
        wait_for_server_ready(host, port).await;
    }

    pub fn log_server_address(&self, config: &Config, ready_in: std::time::Duration) {
        let port = config.server.port;

        // A flush-left intro banner (not routed through the `[BE]` logger). URLs
        // are full so they become clickable in the terminal.
        // @see https://github.com/tuono-labs/tuono/issues/460
        //
        // Colours come from `colored`, which emits ANSI escape sequences and
        // auto-disables when output is not a TTY or `NO_COLOR` is set.
        println!();
        println!(
            "{} {} {}",
            "⚡".yellow(),
            "Ossido".bright_white().bold(),
            format!("v{}", crate_version!()).dimmed()
        );

        println!();
        println!(
            "{}{}",
            format!("{:<9}", "Local:").dimmed(),
            format!("http://localhost:{port}").blue().bold()
        );
        if let Some(ip) = local_ip() {
            println!(
                "{}{}",
                format!("{:<9}", "Network:").dimmed(),
                format!("http://{ip}:{port}").blue().bold()
            );
        }
        if let Some(origin) = &config.server.origin {
            println!(
                "{}{}",
                format!("{:<9}", "Origin:").dimmed(),
                origin.blue().bold()
            );
        }

        println!();
        println!(
            "{}",
            format!("✔ Ready in {}ms", ready_in.as_millis())
                .green()
                .bold()
        );
        println!();
    }

    pub fn restart_process(&mut self, id: ProcessId) {
        trace!("Restarting process {:?}", id);
        if let Some((job, _)) = self.processes.get(&id) {
            job.stop();
            job.start();
        }
    }

    pub async fn wait_for_process(&mut self, id: ProcessId) {
        trace!("Waiting for process {:?}", id);
        if let Some((job, _)) = self.processes.get(&id) {
            job.to_wait().await;
        }
    }

    pub fn abort_all(&mut self) {
        trace!("Aborting all processes");
        for (_, (job, handle)) in self.processes.iter() {
            job.stop();
            handle.abort();
        }
    }
}

fn start_supervisor_job(prog: &str, args: Vec<&str>) -> (Job, JoinHandle<()>) {
    start_job(Arc::new(Command {
        program: Program::Exec {
            prog: prog.into(),
            args: args.into_iter().map(|arg| arg.to_string()).collect(),
        },
        options: Default::default(),
    }))
}
