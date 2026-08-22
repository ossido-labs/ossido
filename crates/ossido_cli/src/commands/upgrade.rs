//! `ossido upgrade` — bump a project's `ossido` crate dep and every
//! `@ossido-labs/*` npm dep to a target version (latest by default), then run
//! the installers. Interactive by default; scriptable via flags.

use std::io::IsTerminal;
use std::path::Path;
use std::process::Command;

use colored::Colorize;
use spinners::{Spinner, Spinners};

use super::{manifest, version_check};

pub struct UpgradeOptions {
    /// Explicit target version (`--version`). `None` resolves to the latest.
    pub target_version: Option<String>,
    /// Report the planned change without touching any files (`--dry-run`).
    pub dry_run: bool,
    /// Skip the interactive confirmation (`--yes`).
    pub yes: bool,
    /// Do not run `cargo update` / the package-manager install (`--no-install`).
    pub no_install: bool,
    /// Offer prerelease beta builds as upgrade targets (`--include-beta`).
    /// Without it, betas are never shown or resolved.
    pub include_beta: bool,
}

pub fn run(opts: UpgradeOptions) {
    let cwd = std::env::current_dir().unwrap_or_else(|_| Path::new(".").to_path_buf());

    if !manifest::is_ossido_project(&cwd) {
        eprintln!(
            "{} not inside a ossido project (no ossido.config.ts here)",
            "error:".red()
        );
        std::process::exit(1);
    }

    let current = current_version(&cwd);

    let Some(target) = resolve_target(&opts, current.as_deref()) else {
        // resolve_target already explained why (cancel / no network + no flag).
        return;
    };

    if Some(target.as_str()) == current.as_deref() {
        println!("Already on ossido {target}. Nothing to do.");
        return;
    }

    let from = current.as_deref().unwrap_or("unknown");

    if opts.dry_run {
        println!(
            "Would upgrade ossido {} → {}",
            from.yellow(),
            target.green()
        );
        println!("  Cargo.toml       : ossido = \"{target}\"");
        println!("  package.json     : @ossido-labs/* = \"{target}\"");
        println!("\n{}", "Dry run — no files were changed.".dimmed());
        return;
    }

    if !confirm(from, &target, &opts) {
        println!("Aborted.");
        return;
    }

    if let Err(err) = apply(&cwd, &target) {
        eprintln!("{} failed to rewrite manifests: {err}", "error:".red());
        std::process::exit(1);
    }
    println!("{} manifests updated to {target}", "✔".green());

    let installed = if opts.no_install {
        false
    } else {
        run_installers(&cwd, &target);
        true
    };

    outro(&target, installed);
}

/// The currently-pinned ossido version — Cargo.toml first, then package.json.
fn current_version(cwd: &Path) -> Option<String> {
    if let Some(v) = std::fs::read_to_string(cwd.join("Cargo.toml"))
        .ok()
        .and_then(|c| manifest::cargo_ossido_version(&c))
    {
        return Some(v);
    }
    std::fs::read_to_string(cwd.join("package.json"))
        .ok()
        .and_then(|c| manifest::package_json_ossido_version(&c))
}

/// Choice of upgrade target for the interactive select.
#[derive(Clone, PartialEq, Eq)]
enum TargetChoice {
    Latest(String),
    Beta(String),
    Custom,
}

/// Resolve the target version: explicit flag → latest from the registry →
/// interactive prompt. Returns `None` when the user cancels or when a version
/// can't be determined non-interactively (with an explanatory message).
fn resolve_target(opts: &UpgradeOptions, _current: Option<&str>) -> Option<String> {
    if let Some(v) = &opts.target_version {
        return Some(normalize(v));
    }

    let latest = version_check::latest_version(false);
    // Betas exist only behind the flag — never fetched, shown, or resolved
    // without it.
    let beta = if opts.include_beta {
        version_check::latest_beta_version(false)
    } else {
        None
    };

    // Non-interactive: take the newest beta when asked for one, else the
    // latest stable, or bail with guidance.
    if opts.yes || !std::io::stdin().is_terminal() {
        let resolved = beta.or(latest);
        if resolved.is_none() {
            eprintln!(
                "{} could not determine the latest version; pass --version X.Y.Z",
                "error:".red()
            );
        }
        return resolved;
    }

    let _ = cliclack::intro("Upgrade ossido");
    let mut select = cliclack::select("Upgrade to which version?");
    if let Some(l) = &latest {
        select = select.item(TargetChoice::Latest(l.clone()), format!("Latest ({l})"), "");
    }
    if let Some(b) = &beta {
        select = select.item(
            TargetChoice::Beta(b.clone()),
            format!("Latest beta ({b})"),
            "prerelease",
        );
    }
    select = select.item(TargetChoice::Custom, "Enter a specific version", "");

    match select.interact().ok()? {
        TargetChoice::Latest(v) | TargetChoice::Beta(v) => Some(v),
        TargetChoice::Custom => cliclack::input("Target version (X.Y.Z)")
            .interact()
            .ok()
            .map(|s: String| normalize(&s)),
    }
}

fn confirm(from: &str, target: &str, opts: &UpgradeOptions) -> bool {
    if opts.yes || !std::io::stdin().is_terminal() {
        return true;
    }
    cliclack::confirm(format!("Upgrade ossido {from} → {target}?"))
        .initial_value(true)
        .interact()
        .unwrap_or(false)
}

fn apply(cwd: &Path, target: &str) -> std::io::Result<()> {
    manifest::rewrite_cargo_toml(cwd, target)?;
    manifest::rewrite_package_json(cwd, target)?;
    Ok(())
}

/// Refresh the lockfiles: `cargo update -p ossido --precise <target>` then the
/// JS package-manager install. Failures warn but do not abort — the manifests
/// are already correct and the user can re-run installers manually.
fn run_installers(cwd: &Path, target: &str) {
    let tick = "✔".green().to_string();

    let mut sp = Spinner::new(Spinners::Dots, "Updating Cargo dependencies".into());
    let cargo_ok = Command::new("cargo")
        .args(["update", "-p", "ossido", "--precise", target])
        .current_dir(cwd)
        .status()
        .map(|s| s.success())
        .unwrap_or(false);
    if cargo_ok {
        sp.stop_and_persist(&tick, "Updating Cargo dependencies".into());
    } else {
        sp.stop_and_persist(
            &"!".yellow().to_string(),
            "cargo update skipped/failed".into(),
        );
    }

    let pm = detect_package_manager(cwd);
    let mut sp = Spinner::new(Spinners::Dots, format!("Installing JS dependencies ({pm})"));
    let js_ok = Command::new(pm)
        .arg("install")
        .current_dir(cwd)
        .status()
        .map(|s| s.success())
        .unwrap_or(false);
    if js_ok {
        sp.stop_and_persist(&tick, format!("Installing JS dependencies ({pm})"));
    } else {
        sp.stop_and_persist(&"!".yellow().to_string(), format!("{pm} install failed"));
    }
}

/// Pick the JS package manager from the project's lockfile; default to npm.
fn detect_package_manager(cwd: &Path) -> &'static str {
    if cwd.join("bun.lock").exists() || cwd.join("bun.lockb").exists() {
        "bun"
    } else {
        "npm"
    }
}

fn outro(target: &str, installed: bool) {
    println!("\n{} upgraded to ossido {target} 🎉", "Success!".green());
    if !installed {
        println!("\nInstall the updated dependencies:");
        println!("  cargo update -p ossido && npm install");
    }
    println!("\nRun the local environment:");
    println!("  ossido dev");
}

/// Strip a leading `v` so `--version v0.2.0` and `0.2.0` behave identically.
fn normalize(v: &str) -> String {
    v.trim().trim_start_matches('v').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_version() {
        assert_eq!(normalize("v0.2.0"), "0.2.0");
        assert_eq!(normalize(" 0.2.0 "), "0.2.0");
    }

    #[test]
    fn detects_bun_then_npm() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(detect_package_manager(dir.path()), "npm");
        std::fs::write(dir.path().join("bun.lock"), "").unwrap();
        assert_eq!(detect_package_manager(dir.path()), "bun");
    }

    #[test]
    fn reads_current_version_from_cargo() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join("Cargo.toml"),
            "[dependencies]\nossido = \"0.1.4\"\n",
        )
        .unwrap();
        assert_eq!(current_version(dir.path()).as_deref(), Some("0.1.4"));
    }

    #[test]
    fn explicit_target_wins() {
        let opts = UpgradeOptions {
            target_version: Some("v0.3.0".into()),
            dry_run: false,
            yes: true,
            no_install: true,
            include_beta: false,
        };
        assert_eq!(
            resolve_target(&opts, Some("0.1.4")).as_deref(),
            Some("0.3.0")
        );
    }
}
