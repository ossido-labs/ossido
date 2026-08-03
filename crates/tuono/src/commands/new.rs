use std::env;
use std::fs::{self, File, OpenOptions, create_dir};
use std::io::prelude::*;
use std::io::{self, IsTerminal};
use std::path::{Path, PathBuf};
use std::process::Command;

use clap::crate_version;
use regex::Regex;
use reqwest::blocking;
use reqwest::blocking::Client;
use serde::Deserialize;
use tracing::trace;

use super::scaffold::{self, BASE_TEMPLATE, Feature, OutputMode};
use crate::mode::Mode;
use crate::source_builder::SourceBuilder;

/// Options for `tuono new`, mirroring the CLI flags.
pub struct NewOptions {
    pub folder_name: Option<String>,
    pub template: Option<String>,
    pub head: Option<bool>,
    pub tailwind: bool,
    pub mdx: bool,
    pub output: Option<OutputMode>,
    /// Skip the interactive wizard and take everything from flags/defaults.
    pub yes: bool,
}

/// The resolved answers (from the wizard or from flags) that drive scaffolding.
struct Selection {
    folder: String,
    features: Vec<&'static Feature>,
    output: OutputMode,
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

pub fn create_new_project(options: NewOptions) {
    // An explicit `--template` keeps the classic behaviour: download that example
    // verbatim, with no wizard and no feature overlays.
    if let Some(template) = options.template.clone() {
        let folder = options
            .folder_name
            .clone()
            .unwrap_or_else(|| ".".to_string());
        let folder_path = scaffold_download(&folder, &template, options.head);
        generate_dot_tuono(&folder_path);
        outro(folder);
        return;
    }

    // Otherwise compose the base template with the selected features.
    let Some(selection) = resolve_selection(&options) else {
        // The user cancelled the wizard.
        return;
    };

    // Tailwind swaps the base template; other features patch onto it.
    let base = scaffold::base_template_for(&selection.features);
    let folder_path = scaffold_download(&selection.folder, base, options.head);
    apply_overlays(&folder_path, &selection);
    generate_dot_tuono(&folder_path);

    outro(selection.folder);
}

/// Resolve the feature/output selection either interactively (the wizard) or,
/// when running non-interactively (`--yes` or no TTY), straight from the flags.
fn resolve_selection(options: &NewOptions) -> Option<Selection> {
    if options.yes || !io::stdout().is_terminal() {
        return Some(selection_from_flags(options));
    }
    run_wizard(options)
}

/// Whether a feature is preselected by a CLI flag (`--tailwind`, `--mdx`, …).
fn feature_preselected(options: &NewOptions, key: &str) -> bool {
    match key {
        "tailwind" => options.tailwind,
        "mdx" => options.mdx,
        _ => false,
    }
}

fn selection_from_flags(options: &NewOptions) -> Selection {
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
    }
}

/// The interactive scaffolding wizard. Returns `None` if the user cancels
/// (e.g. Ctrl-C), in which case scaffolding is aborted cleanly.
fn run_wizard(options: &NewOptions) -> Option<Selection> {
    let _ = cliclack::intro("Create a new Tuono app");

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

    Some(Selection {
        folder,
        features,
        output,
    })
}

/// Apply the selected feature overlays on top of the downloaded base template:
/// merge package.json deps, (re)generate `tuono.config.ts`, and prepend any
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

    // Regenerate tuono.config.ts when a feature needs wiring or the output mode
    // differs from the default; a plain server-mode, no-feature scaffold keeps
    // the template's own config. Tailwind's config contribution is included here
    // even though it drives the base template, so the generated config stays the
    // single source of truth (it reproduces the base's own plugin setup).
    if !selection.features.is_empty() || selection.output != OutputMode::Server {
        let config = scaffold::generate_tuono_config(&selection.features, selection.output);
        if let Err(err) = fs::write(folder_path.join("tuono.config.ts"), config) {
            eprintln!("Warning: failed to write tuono.config.ts: {err}");
        }
    }
}

/// Generate the `.tuono` directory (the `main.rs` entry point, the react entry
/// files, and the TypeScript types) so the Rust crate is valid immediately —
/// its `Cargo.toml` points `[[bin]]` at `.tuono/main.rs`, which would otherwise
/// not exist until the first `tuono dev`/`build`.
///
/// Runs in `Prod` mode: unlike `Dev`, that path never shells out to the (not yet
/// installed) node build scripts. It only reads the scaffolded files, so it needs
/// nothing beyond what was just written. Best-effort — a failure here still leaves
/// a usable project (the next `tuono dev` regenerates `.tuono`).
fn generate_dot_tuono(folder_path: &Path) {
    let previous_dir = env::current_dir();

    if env::set_current_dir(folder_path).is_err() {
        eprintln!("Warning: could not enter the project directory to scaffold .tuono");
        return;
    }

    match SourceBuilder::new(Mode::Prod) {
        Ok(mut builder) => {
            if let Err(err) = builder.base_build() {
                eprintln!("Warning: failed to scaffold .tuono: {err}");
            }
            // Types are a separate step (see `base_build`'s note); best-effort too.
            let _ = builder.generate_typescript_file();
        }
        Err(err) => eprintln!("Warning: failed to scaffold .tuono: {err}"),
    }

    if let Ok(previous_dir) = previous_dir {
        let _ = env::set_current_dir(previous_dir);
    }
}

/// Download `template` from GitHub into `folder`, rewrite the workspace version
/// references, and initialise a git repo. Returns the absolute project path.
fn scaffold_download(folder: &str, template: &str, select_head: Option<bool>) -> PathBuf {
    let github_api_base_url =
        env::var("__INTERNAL_TUONO_TEST").unwrap_or("https://api.github.com".to_string());

    let github_raw_base_url = env::var("__INTERNAL_TUONO_TEST")
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
                "Failed to call the tagged commit tree github API for v{cli_version}"
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
            "Hint: you can view the available templates at https://github.com/tuono-labs/tuono/tree/main/examples"
        );
        std::process::exit(1);
    }

    if folder != "." {
        if Path::new(&folder).exists() {
            eprintln!("Error: Directory '{folder}' already exists");
            println!(
                "Hint: you can scaffold a tuono project within an existing folder with 'cd {folder} && tuono new .'"
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

    update_package_json_version(&folder_path).expect("Failed to update package.json version");
    update_cargo_toml_version(&folder_path).expect("Failed to update Cargo.toml version");

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
        "/tuono-labs/tuono/main".to_string()
    } else {
        format!("/tuono-labs/tuono/v{cli_version}")
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
        return format!("{url}/repos/tuono-labs/tuono/git/trees/main?recursive=1");
    }

    // This string does not include the "v" version prefix
    let response = client
        .get(format!(
            "{url}/repos/tuono-labs/tuono/git/ref/tags/v{cli_version}"
        ))
        .send()
        .unwrap_or_else(|_| {
            exit_with_error(&format!(
                "Failed to reach the GitHub API while resolving the v{cli_version} tag"
            ))
        });

    // A published release is required to pin the templates to this CLI version.
    // The most common failure is a dev build whose git tag isn't published yet:
    // surface that clearly and point at `--head` rather than letting the 404 body
    // fall through to an opaque JSON parse error.
    if response.status().as_u16() == 404 {
        exit_with_error(&format!(
            "No template release found for tuono v{cli_version} — the v{cli_version} git tag does not exist.\nHint: scaffold from the latest `main` instead with `tuono new <folder> --head true`."
        ));
    }

    if !response.status().is_success() {
        exit_with_error(&format!(
            "GitHub API returned {} while resolving the v{cli_version} tag.\nHint: retry, or scaffold from `main` with `tuono new <folder> --head true`.",
            response.status()
        ));
    }

    let res_tag = response.json::<GithubTagResponse>().unwrap_or_else(|_| {
        exit_with_error(&format!(
            "Failed to parse the GitHub tag response for v{cli_version}"
        ))
    });

    format!(
        "{url}/repos/tuono-labs/tuono/git/trees/{}?recursive=1",
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
fn update_package_json_version(folder_path: &Path) -> io::Result<()> {
    let v = crate_version!();
    let package_json_path = folder_path.join(PathBuf::from("package.json"));
    let package_json = fs::read_to_string(&package_json_path)
        .unwrap_or_else(|err| exit_with_error(&format!("Failed to read package.json: {err}")));
    let search = "\"tuono\": \"workspace:*\"";
    let replace = format!("\"tuono\": \"{}\"", v);
    let package_json = package_json.replace(search, &replace);

    let mut file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(package_json_path)
        .unwrap_or_else(|err| exit_with_error(&format!("Failed to open package.json: {err}")));

    file.write_all(package_json.as_bytes())
        .unwrap_or_else(|err| exit_with_error(&format!("Failed to write to package.json: {err}")));

    Ok(())
}

fn update_cargo_toml_version(folder_path: &Path) -> io::Result<()> {
    let v = crate_version!();
    let cargo_toml_path = folder_path.join(PathBuf::from("Cargo.toml"));
    let cargo_toml = fs::read_to_string(&cargo_toml_path)
        .unwrap_or_else(|err| exit_with_error(&format!("Failed to read Cargo.toml: {err}")));
    let cargo_toml = cargo_toml.replace(
        "{ path = \"../../crates/tuono_lib/\" }",
        &format!("\"{v}\""),
    );

    let mut file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(cargo_toml_path)
        .unwrap_or_else(|err| exit_with_error(&format!("Failed to open Cargo.toml: {err}")));

    file.write_all(cargo_toml.as_bytes())
        .unwrap_or_else(|err| exit_with_error(&format!("Failed to write to Cargo.toml: {err}")));

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

fn outro(folder_name: String) {
    println!("Success! 🎉");

    if folder_name != "." {
        println!("\nGo to the project directory:");
        println!("cd {folder_name}/");
    }

    println!("\nInstall the dependencies:");
    println!("npm install");

    println!("\nRun the local environment:");
    println!("tuono dev");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn generate_valid_content_url_from_head() {
        let expected = format!(
            "{}/{}/{}",
            "http://localhost:3000", "tuono-labs/tuono/main", "examples/tuono-app"
        );
        let generated = generate_raw_content_url(
            Some(true),
            crate_version!(),
            &String::from("examples/tuono-app"),
            "http://localhost:3000",
        );
        assert_eq!(expected, generated)
    }

    #[test]
    fn generate_valid_content_url_from_cli_version() {
        let expected = format!(
            "{}/{}/{}",
            "http://localhost:3000",
            &format!("tuono-labs/tuono/v{}", crate_version!()),
            "examples/tuono-app"
        );
        let generated = generate_raw_content_url(
            Some(false),
            crate_version!(),
            &String::from("examples/tuono-app"),
            "http://localhost:3000",
        );
        assert_eq!(expected, generated)
    }
}
