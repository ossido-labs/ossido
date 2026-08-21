use std::env;
use std::fs::{self, File, create_dir};
use std::io::prelude::*;
use std::io::{self, IsTerminal};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use clap::crate_version;
use colored::Colorize;
use regex::Regex;
use reqwest::blocking;
use reqwest::blocking::Client;
use serde::Deserialize;
use spinners::{Spinner, Spinners};
use tracing::trace;

use super::scaffold::{self, BASE_TEMPLATE, Feature, OutputMode};
use super::{doctor, manifest};
use crate::mode::Mode;
use crate::source_builder::SourceBuilder;

/// Options for `ossido new`, mirroring the CLI flags.
pub struct NewOptions {
    pub folder_name: Option<String>,
    pub template: Option<String>,
    pub head: Option<bool>,
    pub tailwind: bool,
    pub mdx: bool,
    pub output: Option<OutputMode>,
    /// Prefix of a `src` path alias (e.g. `@` maps `@/*` to `./src/*`), from
    /// `--alias`. `None` leaves the project without an alias.
    pub path_alias: Option<String>,
    /// Skip the interactive wizard and take everything from flags/defaults.
    pub yes: bool,
    /// Skip the JS dependency install after scaffolding (`--no-install`).
    pub no_install: bool,
}

/// The resolved answers (from the wizard or from flags) that drive scaffolding.
struct Selection {
    folder: String,
    features: Vec<&'static Feature>,
    output: OutputMode,
    /// Prefix of a `src` path alias, or `None`.
    path_alias: Option<String>,
    /// The package manager to install JS dependencies with, or `None` when no
    /// supported one is on `PATH`.
    package_manager: Option<PackageManager>,
}

/// A JS package manager the scaffolder can install dependencies with, in
/// default-preference order (the first available wins when nothing else picks).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
enum PackageManager {
    Bun,
    Npm,
    Pnpm,
    Yarn,
}

impl PackageManager {
    const ALL: [PackageManager; 4] = [Self::Bun, Self::Npm, Self::Pnpm, Self::Yarn];

    fn bin(self) -> &'static str {
        match self {
            Self::Bun => "bun",
            Self::Npm => "npm",
            Self::Pnpm => "pnpm",
            Self::Yarn => "yarn",
        }
    }
}

/// Build a command for a JS package-manager binary. On Windows the launchers
/// are `.cmd` shims, which `Command::new` cannot spawn directly — go through
/// `cmd /C`.
fn pm_command(bin: &str) -> Command {
    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new("cmd");
        command.args(["/C", bin]);
        command
    }
    #[cfg(not(target_os = "windows"))]
    {
        Command::new(bin)
    }
}

/// The supported package managers present on `PATH`, probed with `--version`.
fn available_package_managers() -> Vec<PackageManager> {
    PackageManager::ALL
        .iter()
        .copied()
        .filter(|pm| {
            pm_command(pm.bin())
                .arg("--version")
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .map(|status| status.success())
                .unwrap_or(false)
        })
        .collect()
}

/// The package manager that launched this scaffold — `bun create ossido`,
/// `npm create ossido`, etc. all set `npm_config_user_agent` (e.g.
/// `"bun/1.4.0 npm/? node/v24 …"`), so the wizard can preselect it.
fn package_manager_from_user_agent(user_agent: &str) -> Option<PackageManager> {
    PackageManager::ALL
        .iter()
        .copied()
        .find(|pm| user_agent.starts_with(&format!("{}/", pm.bin())))
}

/// Pick a package manager without prompting: the one that launched the
/// scaffold if it is available, else the first available by preference order.
fn default_package_manager(available: &[PackageManager]) -> Option<PackageManager> {
    let user_agent = env::var("npm_config_user_agent").ok();
    default_package_manager_with_agent(user_agent.as_deref(), available)
}

fn default_package_manager_with_agent(
    user_agent: Option<&str>,
    available: &[PackageManager],
) -> Option<PackageManager> {
    user_agent
        .and_then(package_manager_from_user_agent)
        .filter(|pm| available.contains(pm))
        .or_else(|| available.first().copied())
}

#[derive(Deserialize, Debug)]
enum GithubFileType {
    #[serde(rename = "blob")]
    Blob,
    #[serde(rename = "tree")]
    Tree,
}

#[derive(Deserialize, Debug)]
struct GithubTagObject {
    sha: String,
}

#[derive(Deserialize, Debug)]
struct GithubTagResponse {
    object: GithubTagObject,
}

#[derive(Deserialize, Debug)]
struct GithubTreeResponse<T> {
    tree: Vec<T>,
}

fn exit_with_error(message: &str) -> ! {
    eprintln!("{message}");
    std::process::exit(1);
}

#[derive(Deserialize, Debug)]
struct GithubFile {
    path: String,
    #[serde(rename(deserialize = "type"))]
    element_type: GithubFileType,
}

fn create_file(path: PathBuf, content: String) -> std::io::Result<()> {
    let mut file = File::create(&path).unwrap_or_else(|err| {
        exit_with_error(&format!(
            "Failed to create file {}: {}",
            path.display(),
            err
        ));
    });
    let _ = file.write_all(content.as_bytes());

    Ok(())
}

/// How the JS dependency install ended, driving the outro's next-steps hints.
enum InstallOutcome {
    Installed(PackageManager),
    Failed(PackageManager),
    /// `--no-install`, a test run, or no supported package manager on `PATH`
    /// (the latter carries `None`).
    Skipped(Option<PackageManager>),
}

pub fn create_new_project(options: NewOptions) {
    // Fail fast: reuse the doctor's Rust-toolchain and JS-runtime checks so we
    // never scaffold a project into an environment that cannot build it.
    if !ensure_toolchain_ready() {
        return;
    }

    let available = available_package_managers();
    // The integration tests scaffold against a mock GitHub — never let them
    // (or `--no-install`) run a real registry install.
    let skip_install = options.no_install || env::var("__INTERNAL_OSSIDO_TEST").is_ok();

    // An explicit `--template` keeps the classic behaviour: download that example
    // verbatim, with no wizard and no feature overlays (and so no package-manager
    // prompt — the default resolution applies).
    if let Some(template) = options.template.clone() {
        let folder = options
            .folder_name
            .clone()
            .unwrap_or_else(|| ".".to_string());
        let folder_path = run_step("Creating the project", || {
            scaffold_download(&folder, &template, options.head)
        });
        run_step("Bootstrapping (.ossido)", || {
            generate_dot_ossido(&folder_path);
        });
        let install = run_install(
            &folder_path,
            default_package_manager(&available),
            skip_install,
        );
        outro(folder, &install);
        return;
    }

    // Otherwise compose the base template with the selected features.
    let Some(selection) = resolve_selection(&options, &available) else {
        // The user cancelled the wizard.
        return;
    };

    // Tailwind swaps the base template; other features patch onto it.
    let base = scaffold::base_template_for(&selection.features);
    let folder_path = run_step("Creating the project", || {
        let folder_path = scaffold_download(&selection.folder, base, options.head);
        apply_overlays(&folder_path, &selection);
        folder_path
    });
    run_step("Bootstrapping (.ossido)", || {
        generate_dot_ossido(&folder_path);
    });
    let install = run_install(&folder_path, selection.package_manager, skip_install);

    outro(selection.folder, &install);
}

/// Run one scaffolding stage behind a spinner, persisting a ✔ line when it
/// completes (matching the `ossido upgrade` progress style). A stage that
/// cannot continue exits the process from within, leaving the spinner line —
/// its error output follows immediately below, so the failed stage is obvious.
fn run_step<T>(message: &str, stage: impl FnOnce() -> T) -> T {
    let mut progress = StepProgress::start(message);
    let out = stage();
    progress.done(&"✔".green().to_string(), message);
    out
}

/// A progress line for one scaffolding stage: an animated spinner on a
/// terminal, a plain persisted line when output is piped (tests, CI) — the
/// spinner's redraw frames would otherwise flood captured logs.
struct StepProgress {
    spinner: Option<Spinner>,
}

impl StepProgress {
    fn start(message: &str) -> Self {
        let spinner = io::stdout()
            .is_terminal()
            .then(|| Spinner::new(Spinners::Dots, message.into()));
        Self { spinner }
    }

    fn done(&mut self, symbol: &str, message: &str) {
        match self.spinner.as_mut() {
            Some(spinner) => spinner.stop_and_persist(symbol, message.into()),
            None => println!("{symbol} {message}"),
        }
    }
}

/// Install the scaffolded project's JS dependencies (unless skipped), returning
/// the outcome for the outro. A failed install is a warning, not an abort — the
/// project itself is complete and the user can install manually.
fn run_install(
    folder_path: &Path,
    package_manager: Option<PackageManager>,
    skip: bool,
) -> InstallOutcome {
    let Some(pm) = package_manager else {
        println!(
            "{} no JS package manager found (looked for bun, npm, pnpm, yarn) — skipping the dependency install",
            "!".yellow()
        );
        return InstallOutcome::Skipped(None);
    };
    if skip {
        return InstallOutcome::Skipped(Some(pm));
    }

    let message = format!("Installing JS dependencies ({})", pm.bin());
    let mut progress = StepProgress::start(&message);
    // Capture output so the install runs quietly behind the spinner; surface
    // the tail of it only when the install fails.
    let output = pm_command(pm.bin())
        .arg("install")
        .current_dir(folder_path)
        .output();

    match output {
        Ok(out) if out.status.success() => {
            progress.done(&"✔".green().to_string(), &message);
            InstallOutcome::Installed(pm)
        }
        Ok(out) => {
            progress.done(
                &"!".yellow().to_string(),
                &format!("{} install failed", pm.bin()),
            );
            // The interesting error is at the end; don't flood the terminal.
            let stderr = String::from_utf8_lossy(&out.stderr);
            let tail: Vec<&str> = stderr.lines().rev().take(15).collect();
            for line in tail.iter().rev() {
                eprintln!("  {line}");
            }
            InstallOutcome::Failed(pm)
        }
        Err(err) => {
            progress.done(
                &"!".yellow().to_string(),
                &format!("could not run {} install: {err}", pm.bin()),
            );
            InstallOutcome::Failed(pm)
        }
    }
}

/// Run the doctor's Rust-toolchain and JS-runtime checks before scaffolding.
/// A hard failure (no rustc / no JS runtime, or a rustc too old for edition 2024)
/// prints the fix — install rustup, or Bun for the JS runtime — and aborts before
/// anything is downloaded. Warnings (e.g. bun-only, or a `.nvmrc` mismatch) do not
/// block. Runs from the current directory, which is correct even for a not-yet-
/// created project folder: the checks probe `PATH`, not the target folder.
fn ensure_toolchain_ready() -> bool {
    let cwd = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let checks = doctor::toolchain_checks(&cwd);
    if doctor::any_failed(&checks) {
        eprintln!(
            "{}",
            "Cannot scaffold — your environment is missing a prerequisite:"
                .red()
                .bold()
        );
        doctor::render(&checks);
        return false;
    }
    true
}

/// Resolve the feature/output selection either interactively (the wizard) or,
/// when running non-interactively (`--yes` or no TTY), straight from the flags.
fn resolve_selection(options: &NewOptions, available: &[PackageManager]) -> Option<Selection> {
    if options.yes || !io::stdout().is_terminal() {
        return Some(selection_from_flags(options, available));
    }
    run_wizard(options, available)
}

/// Whether a feature is preselected by a CLI flag (`--tailwind`, `--mdx`, …).
fn feature_preselected(options: &NewOptions, key: &str) -> bool {
    match key {
        "tailwind" => options.tailwind,
        "mdx" => options.mdx,
        _ => false,
    }
}

fn selection_from_flags(options: &NewOptions, available: &[PackageManager]) -> Selection {
    let features = scaffold::ALL_FEATURES
        .iter()
        .copied()
        .filter(|feature| feature_preselected(options, feature.key))
        .collect();

    Selection {
        folder: options
            .folder_name
            .clone()
            .unwrap_or_else(|| ".".to_string()),
        features,
        output: options.output.unwrap_or(OutputMode::Server),
        path_alias: options.path_alias.clone(),
        // Non-interactive: no prompt — the launching package manager (or the
        // first available) wins.
        package_manager: default_package_manager(available),
    }
}

/// The interactive scaffolding wizard. Returns `None` if the user cancels
/// (e.g. Ctrl-C), in which case scaffolding is aborted cleanly.
fn run_wizard(options: &NewOptions, available: &[PackageManager]) -> Option<Selection> {
    let _ = cliclack::intro("Create a new Ossido app");

    let folder = match &options.folder_name {
        Some(folder) => folder.clone(),
        None => cliclack::input("Where should we create your project?")
            .default_input(".")
            .interact()
            .ok()?,
    };

    let mut features: Vec<&'static Feature> = Vec::new();
    for feature in scaffold::ALL_FEATURES {
        let enabled = cliclack::confirm(format!("Use {}?", feature.label))
            .initial_value(feature_preselected(options, feature.key))
            .interact()
            .ok()?;
        if enabled {
            features.push(*feature);
        }
    }

    let output = cliclack::select("Which build output should be the default?")
        .initial_value(options.output.unwrap_or(OutputMode::Server))
        .item(
            OutputMode::Server,
            "Server (SSR)",
            "dynamic server-side rendering",
        )
        .item(
            OutputMode::Static,
            "Static (SSG)",
            "prerender the whole site to static HTML",
        )
        .interact()
        .ok()?;

    // Offer a `src` path alias so imports can read `@/components/…` instead of a
    // pile of `../../`. Wires both `tsconfig.json` `paths` and the ossido config
    // `vite.alias`.
    let path_alias = if cliclack::confirm("Set up a path alias for `src` (e.g. import from '@/…')?")
        .initial_value(options.path_alias.is_some())
        .interact()
        .ok()?
    {
        Some(
            cliclack::input("Alias prefix")
                .default_input(options.path_alias.as_deref().unwrap_or("@"))
                .interact()
                .ok()?,
        )
    } else {
        None
    };

    // Which of the detected package managers should install the dependencies.
    // One (or none) available needs no question; the launching package manager
    // (`bun create ossido` → bun) is the preselected answer.
    let package_manager = match available {
        [] => None,
        [only] => Some(*only),
        _ => {
            let mut select = cliclack::select("Which package manager should install dependencies?")
                .initial_value(default_package_manager(available)?);
            for pm in available {
                select = select.item(*pm, pm.bin(), "");
            }
            Some(select.interact().ok()?)
        }
    };

    Some(Selection {
        folder,
        features,
        output,
        path_alias,
        package_manager,
    })
}

/// Apply the selected feature overlays on top of the downloaded base template:
/// merge package.json deps, (re)generate `ossido.config.ts`, and prepend any
/// feature stylesheet imports to `src/styles/global.css`.
fn apply_overlays(folder_path: &Path, selection: &Selection) {
    // Merge dependencies only when a feature contributes some — otherwise leave
    // the template's package.json byte-for-byte untouched.
    if !selection.features.is_empty() {
        let package_json_path = folder_path.join("package.json");
        match fs::read_to_string(&package_json_path) {
            Ok(source) => match scaffold::merge_package_json(&source, &selection.features) {
                Ok(merged) => {
                    if let Err(err) = fs::write(&package_json_path, merged) {
                        eprintln!("Warning: failed to write package.json: {err}");
                    }
                }
                Err(err) => eprintln!("Warning: failed to merge dependencies: {err}"),
            },
            Err(err) => eprintln!("Warning: failed to read package.json: {err}"),
        }
    }

    // Regenerate ossido.config.ts when a feature needs wiring or the output mode
    // differs from the default; a plain server-mode, no-feature scaffold keeps
    // the template's own config. Tailwind's config contribution is included here
    // even though it drives the base template, so the generated config stays the
    // single source of truth (it reproduces the base's own plugin setup).
    let alias = selection.path_alias.as_deref();
    if !selection.features.is_empty() || selection.output != OutputMode::Server || alias.is_some() {
        let config = scaffold::generate_ossido_config(&selection.features, selection.output, alias);
        if let Err(err) = fs::write(folder_path.join("ossido.config.ts"), config) {
            eprintln!("Warning: failed to write ossido.config.ts: {err}");
        }
    }

    // The ossido config carries the vite alias; tsconfig carries the matching
    // `paths` entry so the TypeScript language server resolves it too.
    if let Some(prefix) = alias {
        apply_tsconfig_paths(folder_path, prefix);
    }
}

/// Add a `compilerOptions.paths` entry mapping `<prefix>/*` to `./src/*` to the
/// scaffolded `tsconfig.json`, keeping the file's comments intact (it's JSONC,
/// so it's patched textually rather than parsed). No-op if a `paths` mapping
/// already exists or `compilerOptions` can't be found — best-effort, like the
/// other overlays.
fn apply_tsconfig_paths(folder_path: &Path, prefix: &str) {
    let tsconfig_path = folder_path.join("tsconfig.json");
    let content = match fs::read_to_string(&tsconfig_path) {
        Ok(content) => content,
        Err(err) => {
            eprintln!("Warning: failed to read tsconfig.json for the path alias: {err}");
            return;
        }
    };

    // A missing `Some` means a paths mapping already exists, or compilerOptions
    // couldn't be found — leave the file untouched (best-effort, like the other
    // overlays).
    if let Some(updated) = insert_tsconfig_paths(&content, prefix)
        && let Err(err) = fs::write(&tsconfig_path, updated)
    {
        eprintln!("Warning: failed to write the tsconfig.json path alias: {err}");
    }
}

/// Insert a `paths` mapping (`<prefix>/*` → `./src/*`) into a tsconfig's
/// `compilerOptions`, textually so the file's JSONC comments survive. Returns
/// `None` — meaning leave the file as-is — when a `paths` entry already exists
/// or `compilerOptions` can't be located.
fn insert_tsconfig_paths(content: &str, prefix: &str) -> Option<String> {
    if content.contains("\"paths\"") {
        return None;
    }

    let anchor = "\"compilerOptions\": {";
    let pos = content.find(anchor)?;
    let insert_at = pos + anchor.len();
    let addition = format!("\n    \"paths\": {{\n      \"{prefix}/*\": [\"./src/*\"]\n    }},");

    let mut updated = String::with_capacity(content.len() + addition.len());
    updated.push_str(&content[..insert_at]);
    updated.push_str(&addition);
    updated.push_str(&content[insert_at..]);
    Some(updated)
}

/// Generate the `.ossido` directory (the `main.rs` entry point, the react entry
/// files, and the TypeScript types) so the Rust crate is valid immediately —
/// its `Cargo.toml` points `[[bin]]` at `.ossido/main.rs`, which would otherwise
/// not exist until the first `ossido dev`/`build`.
///
/// Runs in `Prod` mode: unlike `Dev`, that path never shells out to the (not yet
/// installed) node build scripts. It only reads the scaffolded files, so it needs
/// nothing beyond what was just written. Best-effort — a failure here still leaves
/// a usable project (the next `ossido dev` regenerates `.ossido`).
fn generate_dot_ossido(folder_path: &Path) {
    let previous_dir = env::current_dir();

    if env::set_current_dir(folder_path).is_err() {
        eprintln!("Warning: could not enter the project directory to scaffold .ossido");
        return;
    }

    match SourceBuilder::new(Mode::Prod) {
        Ok(mut builder) => {
            if let Err(err) = builder.base_build() {
                eprintln!("Warning: failed to scaffold .ossido: {err}");
            }
            // Types are a separate step (see `base_build`'s note); best-effort too.
            let _ = builder.generate_typescript_file();
        }
        Err(err) => eprintln!("Warning: failed to scaffold .ossido: {err}"),
    }

    if let Ok(previous_dir) = previous_dir {
        let _ = env::set_current_dir(previous_dir);
    }
}

/// Download `template` from GitHub into `folder`, rewrite the workspace version
/// references, and initialise a git repo. Returns the absolute project path.
fn scaffold_download(folder: &str, template: &str, select_head: Option<bool>) -> PathBuf {
    let github_api_base_url =
        env::var("__INTERNAL_OSSIDO_TEST").unwrap_or("https://api.github.com".to_string());

    let github_raw_base_url = env::var("__INTERNAL_OSSIDO_TEST")
        .unwrap_or("https://raw.githubusercontent.com".to_string());

    let client = blocking::Client::builder()
        .user_agent("")
        .build()
        .unwrap_or_else(|_| exit_with_error("Error: Failed to build request client"));

    // This string does not include the "v" version prefix
    let cli_version: &str = crate_version!();

    let tree_url: String =
        generate_tree_url(select_head, &client, cli_version, &github_api_base_url);

    let res_tree = client
        .get(tree_url)
        .send()
        .unwrap_or_else(|_| {
            exit_with_error(&format!(
                "Failed to call the tagged commit tree github API for {cli_version}"
            ))
        })
        .json::<GithubTreeResponse<GithubFile>>()
        .expect("Failed to parse the tree structure");

    let new_project_files = res_tree
        .tree
        .iter()
        .filter(|GithubFile { path, .. }| path.starts_with(&format!("examples/{template}/")))
        .collect::<Vec<&GithubFile>>();

    if new_project_files.is_empty() {
        eprintln!("Error: Template '{template}' not found");
        println!(
            "Hint: you can view the available templates at https://github.com/ossido-labs/ossido/tree/main/examples"
        );
        std::process::exit(1);
    }

    if folder != "." {
        if Path::new(&folder).exists() {
            eprintln!("Error: Directory '{folder}' already exists");
            println!(
                "Hint: you can scaffold a ossido project within an existing folder with 'cd {folder} && ossido new .'"
            );
            std::process::exit(1);
        }
        create_dir(folder).unwrap();
    }

    let current_dir = env::current_dir().expect("Failed to get current working directory");
    let folder_path = current_dir.join(PathBuf::from(&folder));

    create_directories(&new_project_files, &folder_path, &template.to_string())
        .unwrap_or_else(|err| exit_with_error(&format!("Failed to create directories: {err}")));

    for GithubFile {
        element_type, path, ..
    } in new_project_files.iter()
    {
        if let GithubFileType::Blob = element_type {
            let url =
                generate_raw_content_url(select_head, cli_version, path, &github_raw_base_url);

            let response = client
                .get(&url)
                .send()
                .unwrap_or_else(|_| exit_with_error("Failed to call the folder github API"));

            // Fail loudly instead of writing an error body (e.g. "404: Not
            // Found") into a project file.
            if !response.status().is_success() {
                exit_with_error(&format!(
                    "Failed to download {path} ({}). The template may be incomplete for this ref.",
                    response.status()
                ));
            }

            let file_content = response
                .text()
                .unwrap_or_else(|_| exit_with_error("Failed to read the downloaded file contents"));

            let path = PathBuf::from(&path.replace(&format!("examples/{template}/"), ""));

            let file_path = folder_path.join(&path);

            if let Err(err) = create_file(file_path, file_content) {
                exit_with_error(&format!("Failed to create file: {err}"));
            }
        }
    }

    // Pin every `@ossido-labs/*` interlink and the `ossido` crate path dep to
    // this CLI's version — the packages are versioned together, and
    // `workspace:*` / the path dep are only valid inside the monorepo.
    manifest::rewrite_package_json(&folder_path, crate_version!())
        .unwrap_or_else(|err| exit_with_error(&format!("Failed to update package.json: {err}")));
    manifest::rewrite_cargo_toml(&folder_path, crate_version!())
        .unwrap_or_else(|err| exit_with_error(&format!("Failed to update Cargo.toml: {err}")));

    let project_name = derive_project_name(folder, &current_dir);
    set_manifest_names(&folder_path, &project_name);

    init_new_git_repo(&folder_path);

    folder_path
}

/// A crate/npm-safe project name derived from the target folder (its basename,
/// lowercased with non-alphanumeric runs turned into `-`). Falls back to the
/// base template name if the folder yields nothing usable.
fn derive_project_name(folder: &str, current_dir: &Path) -> String {
    let raw = if folder == "." {
        current_dir
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or(BASE_TEMPLATE)
    } else {
        Path::new(folder)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or(folder)
    };

    let sanitized: String = raw
        .trim()
        .to_lowercase()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '-'
            }
        })
        .collect();

    let sanitized = sanitized.trim_matches('-').to_string();
    if sanitized.is_empty() {
        BASE_TEMPLATE.to_string()
    } else {
        sanitized
    }
}

/// Rewrite the `[package]` name in Cargo.toml and the top-level `name` in
/// package.json to `project_name`, preserving the rest of each file. Both target
/// the first matching key, which is the project's own (the `[[bin]]` name and any
/// dependency keys come later).
fn set_manifest_names(folder_path: &Path, project_name: &str) {
    let package_json_path = folder_path.join("package.json");
    if let Ok(content) = fs::read_to_string(&package_json_path) {
        let re = Regex::new(r#""name"\s*:\s*"[^"]*""#).expect("valid regex");
        let updated = re.replace(&content, format!("\"name\": \"{project_name}\"").as_str());
        if let Err(err) = fs::write(&package_json_path, updated.as_ref()) {
            eprintln!("Warning: failed to set package.json name: {err}");
        }
    }

    let cargo_toml_path = folder_path.join("Cargo.toml");
    if let Ok(content) = fs::read_to_string(&cargo_toml_path) {
        let re = Regex::new(r#"name\s*=\s*"[^"]*""#).expect("valid regex");
        let updated = re.replace(&content, format!("name = \"{project_name}\"").as_str());
        if let Err(err) = fs::write(&cargo_toml_path, updated.as_ref()) {
            eprintln!("Warning: failed to set Cargo.toml name: {err}");
        }
    }
}

fn generate_raw_content_url(
    select_head: Option<bool>,
    cli_version: &str,
    path: &String,
    url: &str,
) -> String {
    let tag = if select_head.unwrap_or(false) {
        "/ossido-labs/ossido/main".to_string()
    } else {
        format!("/ossido-labs/ossido/{cli_version}")
    };
    format!("{url}{tag}/{path}")
}

fn generate_tree_url(
    select_head: Option<bool>,
    client: &Client,
    cli_version: &str,
    url: &str,
) -> String {
    if select_head.unwrap_or(false) {
        return format!("{url}/repos/ossido-labs/ossido/git/trees/main?recursive=1");
    }

    // Release tags are bare semver (no `v` prefix), matching crate_version!().
    let response = client
        .get(format!(
            "{url}/repos/ossido-labs/ossido/git/ref/tags/{cli_version}"
        ))
        .send()
        .unwrap_or_else(|_| {
            exit_with_error(&format!(
                "Failed to reach the GitHub API while resolving the {cli_version} tag"
            ))
        });

    // A published release is required to pin the templates to this CLI version.
    // The most common failure is a dev build whose git tag isn't published yet:
    // surface that clearly and point at `--head` rather than letting the 404 body
    // fall through to an opaque JSON parse error.
    if response.status().as_u16() == 404 {
        exit_with_error(&format!(
            "No template release found for ossido {cli_version} — the {cli_version} git tag does not exist.\nHint: scaffold from the latest `main` instead with `ossido new <folder> --head true`."
        ));
    }

    if !response.status().is_success() {
        exit_with_error(&format!(
            "GitHub API returned {} while resolving the {cli_version} tag.\nHint: retry, or scaffold from `main` with `ossido new <folder> --head true`.",
            response.status()
        ));
    }

    let res_tag = response.json::<GithubTagResponse>().unwrap_or_else(|_| {
        exit_with_error(&format!(
            "Failed to parse the GitHub tag response for {cli_version}"
        ))
    });

    format!(
        "{url}/repos/ossido-labs/ossido/git/trees/{}?recursive=1",
        res_tag.object.sha
    )
}

fn create_directories(
    new_project_files: &[&GithubFile],
    folder_path: &Path,
    template: &String,
) -> io::Result<()> {
    for GithubFile {
        element_type, path, ..
    } in new_project_files.iter()
    {
        if let GithubFileType::Tree = element_type {
            let path = PathBuf::from(&path.replace(&format!("examples/{template}/"), ""));

            let dir_path = folder_path.join(&path);
            if let Err(e) = create_dir(&dir_path) {
                eprintln!("Failed to create directory {}: {}", dir_path.display(), e);
                std::process::exit(1);
            }
        }
    }
    Ok(())
}
fn init_new_git_repo(folder_path: &Path) {
    if let Ok(output) = Command::new("git").arg("init").arg(folder_path).output() {
        if !output.status.success() {
            trace!("Failed to initialise a new git repo")
        }
    } else {
        trace!("Failed to initialise a new git repo")
    }
}

fn outro(folder_name: String, install: &InstallOutcome) {
    let pm_bin = match install {
        InstallOutcome::Installed(pm)
        | InstallOutcome::Failed(pm)
        | InstallOutcome::Skipped(Some(pm)) => pm.bin(),
        InstallOutcome::Skipped(None) => "npm",
    };

    println!("\n{} 🎉", "Ready!".green().bold());

    if folder_name != "." {
        println!("\nGo to the project directory:");
        println!("cd {folder_name}/");
    }

    // Dependencies are installed by the scaffold; only point at a manual
    // install when that didn't happen.
    if !matches!(install, InstallOutcome::Installed(_)) {
        println!("\nInstall the dependencies:");
        println!("{pm_bin} install");
    }

    println!("\nRun the local environment:");
    println!("{pm_bin} run dev");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_the_launching_package_manager_from_the_user_agent() {
        // The `npm_config_user_agent` shapes each manager sets for `create` runs.
        assert_eq!(
            package_manager_from_user_agent("bun/1.4.0 npm/? node/v24.3.0 darwin arm64"),
            Some(PackageManager::Bun)
        );
        assert_eq!(
            package_manager_from_user_agent(
                "npm/11.6.0 node/v24.14.1 darwin arm64 workspaces/false"
            ),
            Some(PackageManager::Npm)
        );
        assert_eq!(
            package_manager_from_user_agent("pnpm/9.12.0 npm/? node/v22.1.0 linux x64"),
            Some(PackageManager::Pnpm)
        );
        assert_eq!(
            package_manager_from_user_agent("yarn/1.22.22 npm/? node/v20.0.0 linux x64"),
            Some(PackageManager::Yarn)
        );
        // Unknown agents (or a plain `ossido new` with no agent) fall through.
        assert_eq!(package_manager_from_user_agent("deno/2.0.0"), None);
        assert_eq!(package_manager_from_user_agent(""), None);
    }

    #[test]
    fn default_package_manager_prefers_the_agent_then_availability_order() {
        let available = [PackageManager::Pnpm, PackageManager::Npm];
        // The launching manager wins when it is available…
        assert_eq!(
            default_package_manager_with_agent(Some("npm/11.6.0 node/v24"), &available),
            Some(PackageManager::Npm)
        );
        // …an unavailable one falls back to the first available…
        assert_eq!(
            default_package_manager_with_agent(Some("bun/1.4.0"), &available),
            Some(PackageManager::Pnpm)
        );
        // …as does no agent at all; and nothing available means no manager.
        assert_eq!(
            default_package_manager_with_agent(None, &available),
            Some(PackageManager::Pnpm)
        );
        assert_eq!(default_package_manager_with_agent(None, &[]), None);
    }

    #[test]
    fn generate_valid_content_url_from_head() {
        let expected = format!(
            "{}/{}/{}",
            "http://localhost:3000", "ossido-labs/ossido/main", "examples/ossido-app"
        );
        let generated = generate_raw_content_url(
            Some(true),
            crate_version!(),
            &String::from("examples/ossido-app"),
            "http://localhost:3000",
        );
        assert_eq!(expected, generated)
    }

    #[test]
    fn generate_valid_content_url_from_cli_version() {
        let expected = format!(
            "{}/ossido-labs/ossido/{}/{}",
            "http://localhost:3000",
            crate_version!(),
            "examples/ossido-app"
        );
        let generated = generate_raw_content_url(
            Some(false),
            crate_version!(),
            &String::from("examples/ossido-app"),
            "http://localhost:3000",
        );
        assert_eq!(expected, generated)
    }

    #[test]
    fn inserts_paths_into_compiler_options_preserving_comments() {
        let tsconfig = "{\n  \"compilerOptions\": {\n    // Typechecking\n    \"strict\": true\n  },\n  \"include\": [\"src\"]\n}\n";
        let updated = insert_tsconfig_paths(tsconfig, "@").unwrap();
        assert!(updated.contains("\"paths\": {\n      \"@/*\": [\"./src/*\"]\n    },"));
        // The JSONC comment (and everything else) survives the textual patch.
        assert!(updated.contains("// Typechecking"));
        assert!(updated.contains("\"strict\": true"));
    }

    #[test]
    fn honors_a_custom_alias_prefix() {
        let tsconfig = "{\n  \"compilerOptions\": {\n    \"strict\": true\n  }\n}\n";
        let updated = insert_tsconfig_paths(tsconfig, "~").unwrap();
        assert!(updated.contains("\"~/*\": [\"./src/*\"]"));
    }

    #[test]
    fn does_not_clobber_an_existing_paths_mapping() {
        let tsconfig =
            "{\n  \"compilerOptions\": {\n    \"paths\": { \"~/*\": [\"./src/*\"] }\n  }\n}\n";
        assert!(insert_tsconfig_paths(tsconfig, "@").is_none());
    }

    #[test]
    fn skips_when_compiler_options_is_absent() {
        assert!(insert_tsconfig_paths("{}", "@").is_none());
    }
}
