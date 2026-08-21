//! `ossido doctor` — read-only diagnostics for a ossido project and its
//! toolchain. Runs a series of independent checks, prints a pass/warn/fail
//! report, and returns a process exit code (non-zero only on a hard failure).

use std::fs;
use std::path::Path;
use std::process::Command;

use colored::Colorize;
use regex::Regex;

use super::{manifest, version_check};

/// The lowest Rust release that can compile edition-2024 crates, which the
/// generated project uses. Below this, `cargo build` will not work.
const EDITION_2024_MIN: version_check::Version = version_check::Version {
    major: 1,
    minor: 85,
    patch: 0,
};

pub struct DoctorOptions {
    /// Skip network checks (crates.io / npm latest-version lookup).
    pub offline: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Status {
    Ok,
    Warn,
    Fail,
}

pub struct Check {
    name: String,
    status: Status,
    message: String,
    hint: Option<String>,
}

impl Check {
    fn ok(name: &str, message: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            status: Status::Ok,
            message: message.into(),
            hint: None,
        }
    }
    fn warn(name: &str, message: impl Into<String>, hint: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            status: Status::Warn,
            message: message.into(),
            hint: Some(hint.into()),
        }
    }
    fn fail(name: &str, message: impl Into<String>, hint: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            status: Status::Fail,
            message: message.into(),
            hint: Some(hint.into()),
        }
    }
}

/// Run every check, render the report, and return the process exit code
/// (`1` if any check failed, else `0`; warnings never fail the exit code).
pub fn run(opts: DoctorOptions) -> i32 {
    let cwd = std::env::current_dir().unwrap_or_else(|_| Path::new(".").to_path_buf());

    println!("Running ossido doctor...\n");

    let project = manifest::is_ossido_project(&cwd);
    let mut checks = vec![check_is_ossido_project(project)];

    // Project-scoped checks only make sense inside a project; still run the
    // toolchain/runtime checks regardless so a bare directory gets useful output.
    if project {
        checks.push(check_version_match(&cwd));
        checks.push(check_latest_version(&cwd, opts.offline));
        checks.push(check_node_modules(&cwd));
        checks.push(check_dot_ossido(&cwd));
    }
    checks.push(check_rust_toolchain(&cwd));
    checks.push(check_js_runtime(&cwd));

    render(&checks);

    if checks.iter().any(|c| c.status == Status::Fail) {
        1
    } else {
        0
    }
}

fn check_is_ossido_project(is_project: bool) -> Check {
    if is_project {
        Check::ok("project", "ossido.config.ts found")
    } else {
        Check::fail(
            "project",
            "not inside a ossido project",
            "run this from a directory containing ossido.config.ts",
        )
    }
}

/// Compare the `ossido` crate version (Cargo.toml) with the `@ossido-labs/ossido`
/// npm version (package.json); they must move together.
fn check_version_match(cwd: &Path) -> Check {
    let cargo = fs::read_to_string(cwd.join("Cargo.toml")).ok();
    let pkg = fs::read_to_string(cwd.join("package.json")).ok();
    let crate_v = cargo.as_deref().and_then(manifest::cargo_ossido_version);
    let npm_v = pkg
        .as_deref()
        .and_then(manifest::package_json_ossido_version);

    match (crate_v, npm_v) {
        (Some(c), Some(n)) if c == n => Check::ok("versions", format!("crate and npm both on {c}")),
        (Some(c), Some(n)) => Check::warn(
            "versions",
            format!("crate is {c} but @ossido-labs/ossido is {n}"),
            "run `ossido upgrade` to bring both to the same version",
        ),
        _ => Check::warn(
            "versions",
            "could not read a pinned ossido version from both manifests",
            "monorepo path/workspace deps are expected here; otherwise check Cargo.toml and package.json",
        ),
    }
}

/// Inform when a newer ossido has been published. Network; skipped when offline.
fn check_latest_version(cwd: &Path, offline: bool) -> Check {
    let cargo = fs::read_to_string(cwd.join("Cargo.toml")).ok();
    let current = cargo.as_deref().and_then(manifest::cargo_ossido_version);

    if offline {
        return Check::ok("latest", "skipped (offline)");
    }
    match (current, version_check::latest_version(false)) {
        (Some(current), Some(latest)) if version_check::is_behind(&current, &latest) => {
            Check::warn(
                "latest",
                format!("{current} installed, {latest} available"),
                format!("run `ossido upgrade` to move to {latest}"),
            )
        }
        (Some(current), Some(_)) => Check::ok("latest", format!("up to date ({current})")),
        (_, None) => Check::warn(
            "latest",
            "could not reach the registry",
            "check your network connection, or re-run with --offline to skip",
        ),
        (None, Some(_)) => Check::ok("latest", "no pinned version to compare"),
    }
}

/// `rustc` present and satisfying either the project's pinned toolchain
/// (`rust-toolchain.toml`) or the edition-2024 floor.
fn check_rust_toolchain(cwd: &Path) -> Check {
    let Some(rustc) = probe_version("rustc", "--version")
        .as_deref()
        .and_then(parse_rustc_version)
    else {
        return Check::fail(
            "rust",
            "rustc not found",
            "install Rust from https://rustup.rs",
        );
    };

    // A pinned toolchain (from the scaffold template) is the source of truth.
    if let Some(pinned) = read_toolchain_channel(cwd) {
        return match version_check::parse_version(&pinned) {
            Some(want) if version_check::parse_version(&rustc) == Some(want) => {
                Check::ok("rust", format!("rustc {rustc} matches pinned {pinned}"))
            }
            Some(_) => Check::warn(
                "rust",
                format!("rustc {rustc} differs from pinned {pinned}"),
                format!(
                    "run `rustup toolchain install {pinned}` (rustup uses rust-toolchain.toml automatically)"
                ),
            ),
            // Non-numeric channel (e.g. "stable") — fall through to the floor.
            None => floor_check(&rustc),
        };
    }

    floor_check(&rustc)
}

fn floor_check(rustc: &str) -> Check {
    match version_check::parse_version(rustc) {
        Some(v) if v >= EDITION_2024_MIN => Check::ok("rust", format!("rustc {rustc}")),
        _ => Check::fail(
            "rust",
            format!("rustc {rustc} is too old for edition 2024"),
            "run `rustup update` (edition 2024 needs rustc >= 1.85)",
        ),
    }
}

/// A single JS-runtime check — either node or bun satisfies it, so it fails only
/// when neither is installed. node is preferred (the build shells out to it) and,
/// when present, is compared against `.nvmrc`; bun alone still passes but is
/// flagged, since the build currently invokes `node` by name.
fn check_js_runtime(cwd: &Path) -> Check {
    let node = probe_version("node", "--version").map(|v| parse_node_version(&v));
    let bun = probe_version("bun", "--version").map(|v| v.trim().to_string());

    match (node, bun) {
        (Some(node), bun) => {
            let also = bun
                .map(|b| format!(" (bun {b} also present)"))
                .unwrap_or_default();
            match read_nvmrc(cwd).and_then(|w| version_check::parse_version(&w)) {
                Some(want)
                    if version_check::parse_version(&node).map(|h| h.major) != Some(want.major) =>
                {
                    Check::warn(
                        "js runtime",
                        format!("node {node}{also}"),
                        format!(
                            "node differs from .nvmrc (wants {}.x); run `nvm use`",
                            want.major
                        ),
                    )
                }
                _ => Check::ok("js runtime", format!("node {node}{also}")),
            }
        }
        (None, Some(bun)) => Check::warn(
            "js runtime",
            format!("bun {bun} found, but node is not installed"),
            "node or bun works, but the build shells out to `node` by name — install it (see .nvmrc)",
        ),
        (None, None) => Check::fail(
            "js runtime",
            "no JS runtime found",
            "install Node (see .nvmrc) or bun — either one works",
        ),
    }
}

fn check_node_modules(cwd: &Path) -> Check {
    if cwd.join("node_modules").is_dir() {
        Check::ok("deps", "node_modules present")
    } else {
        Check::warn(
            "deps",
            "node_modules missing",
            "run `npm install` (or `bun install`)",
        )
    }
}

fn check_dot_ossido(cwd: &Path) -> Check {
    if cwd.join(".ossido").is_dir() {
        Check::ok("build", ".ossido present")
    } else {
        Check::warn(
            "build",
            ".ossido not generated yet",
            "run `ossido dev` or `ossido build` to generate it",
        )
    }
}

// --- probes & parsers (parsers kept pure so they are unit-testable) ---

/// Run `bin arg` and return trimmed stdout, or `None` if the binary is absent
/// or exits non-zero.
fn probe_version(bin: &str, arg: &str) -> Option<String> {
    let out = Command::new(bin).arg(arg).output().ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if s.is_empty() { None } else { Some(s) }
}

/// `"rustc 1.98.0 (abc 2026-...)"` -> `"1.98.0"`.
fn parse_rustc_version(line: &str) -> Option<String> {
    line.split_whitespace().nth(1).map(str::to_string)
}

/// `"v24.14.1"` -> `"24.14.1"`.
fn parse_node_version(line: &str) -> String {
    line.trim().trim_start_matches('v').to_string()
}

/// `[toolchain] channel = "1.98.0"` from `rust-toolchain.toml`, if present.
fn read_toolchain_channel(cwd: &Path) -> Option<String> {
    let content = fs::read_to_string(cwd.join("rust-toolchain.toml")).ok()?;
    let re = Regex::new(r#"(?m)^\s*channel\s*=\s*"([^"]+)""#).expect("valid regex");
    re.captures(&content).map(|c| c[1].to_string())
}

fn read_nvmrc(cwd: &Path) -> Option<String> {
    fs::read_to_string(cwd.join(".nvmrc"))
        .ok()
        .map(|s| s.trim().to_string())
}

fn render(checks: &[Check]) {
    for c in checks {
        let icon = match c.status {
            Status::Ok => "✔".green(),
            Status::Warn => "!".yellow(),
            Status::Fail => "✘".red(),
        };
        println!("{icon} {}: {}", c.name.bold(), c.message);
        if let Some(hint) = &c.hint {
            println!("  {}", format!("→ {hint}").dimmed());
        }
    }

    let fails = checks.iter().filter(|c| c.status == Status::Fail).count();
    let warns = checks.iter().filter(|c| c.status == Status::Warn).count();
    println!();
    if fails > 0 {
        println!("{}", format!("{fails} failed, {warns} warning(s)").red());
    } else if warns > 0 {
        println!("{}", format!("All clear — {warns} warning(s)").yellow());
    } else {
        println!("{}", "All checks passed 🎉".green());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_rustc_line() {
        assert_eq!(
            parse_rustc_version("rustc 1.98.0 (88d9e12ae 2026-08-18)").as_deref(),
            Some("1.98.0")
        );
        assert_eq!(parse_rustc_version("").as_deref(), None);
    }

    #[test]
    fn parses_node_line() {
        assert_eq!(parse_node_version("v24.14.1"), "24.14.1");
        assert_eq!(parse_node_version("24.14.1\n"), "24.14.1");
    }

    #[test]
    fn floor_passes_and_fails() {
        assert_eq!(floor_check("1.98.0").status, Status::Ok);
        assert_eq!(floor_check("1.85.0").status, Status::Ok);
        assert_eq!(floor_check("1.84.0").status, Status::Fail);
    }

    #[test]
    fn reads_channel_and_nvmrc_from_dir() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(
            dir.path().join("rust-toolchain.toml"),
            "[toolchain]\nchannel = \"1.98.0\"\ncomponents = [\"clippy\"]\n",
        )
        .unwrap();
        fs::write(dir.path().join(".nvmrc"), "24.14.1\n").unwrap();
        assert_eq!(
            read_toolchain_channel(dir.path()).as_deref(),
            Some("1.98.0")
        );
        assert_eq!(read_nvmrc(dir.path()).as_deref(), Some("24.14.1"));
    }

    #[test]
    fn version_match_ok_and_warn() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(
            dir.path().join("Cargo.toml"),
            "[dependencies]\nossido = \"0.1.4\"\n",
        )
        .unwrap();
        fs::write(
            dir.path().join("package.json"),
            "{ \"dependencies\": { \"@ossido-labs/ossido\": \"0.1.4\" } }",
        )
        .unwrap();
        assert_eq!(check_version_match(dir.path()).status, Status::Ok);

        fs::write(
            dir.path().join("package.json"),
            "{ \"dependencies\": { \"@ossido-labs/ossido\": \"0.1.3\" } }",
        )
        .unwrap();
        assert_eq!(check_version_match(dir.path()).status, Status::Warn);
    }

    #[test]
    fn project_check_reflects_flag() {
        assert_eq!(check_is_ossido_project(true).status, Status::Ok);
        assert_eq!(check_is_ossido_project(false).status, Status::Fail);
    }
}
