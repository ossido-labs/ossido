//! Shared reading/rewriting of a project's two ossido manifests — the Rust
//! `Cargo.toml` (`ossido` crate dep) and the JS `package.json` (`@ossido-labs/*`
//! deps). Used by both `new` (pin `workspace:*`/path deps to the CLI version when
//! scaffolding) and `upgrade` (bump an already-pinned version).
//!
//! Everything is regex/string based rather than parsed through a TOML/JSON model
//! so formatting and comments survive the rewrite untouched, matching the rest of
//! the CLI's manifest handling.

use std::path::Path;
use std::sync::LazyLock;
use std::{fs, io};

use regex::Regex;

// The `\bossido\s*=` prefix matches the `ossido` dependency wherever it sits
// (own line or a single-line manifest) while rejecting sibling crates like
// `ossido_ssr` — after `ossido` comes `_`, so `\s*=` can never follow.
//
/// `ossido` as a plain string dep: `ossido = "0.1.4"`.
static CARGO_PLAIN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(\bossido\s*=\s*)"[^"]*""#).expect("valid regex"));
/// `ossido` as an inline table carrying a version:
/// `ossido = { version = "0.1.4", features = [..] }`.
static CARGO_OBJECT_VERSION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(\bossido\s*=\s*\{[^}]*version\s*=\s*)"[^"]*""#).expect("valid regex")
});
/// `ossido` as a path dep: `ossido = { path = "../../crates/ossido" }`.
static CARGO_PATH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(\bossido\s*=\s*)\{[^}]*\bpath\b[^}]*\}"#).expect("valid regex")
});
/// Any `@ossido-labs/*` dependency value in package.json.
static PKG_OSSIDO_DEP: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#""(@ossido-labs/[^"]+)"\s*:\s*"[^"]+""#).expect("valid regex"));
/// The `@ossido-labs/ossido` dependency value specifically.
static PKG_OSSIDO_VERSION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#""@ossido-labs/ossido"\s*:\s*"([^"]+)""#).expect("valid regex"));

/// A project directory is a ossido project if it has an `ossido.config.ts`.
/// Mirrors the guard in `SourceBuilder::new`, but cheap and non-fatal so the
/// diagnostic/upgrade commands can decide how to react.
pub fn is_ossido_project(dir: &Path) -> bool {
    dir.join("ossido.config.ts").exists()
}

/// The pinned `ossido` crate version from a `Cargo.toml`, or `None` for a path
/// dep (monorepo example) or when the dep is absent.
pub fn cargo_ossido_version(cargo_toml: &str) -> Option<String> {
    if CARGO_OBJECT_VERSION.is_match(cargo_toml) {
        return capture_after(cargo_toml, &CARGO_OBJECT_VERSION);
    }
    if CARGO_PATH.is_match(cargo_toml) {
        return None;
    }
    capture_after(cargo_toml, &CARGO_PLAIN)
}

/// Both `CARGO_*` regexes capture the leading `ossido = ...` prefix as group 1
/// and are immediately followed by a `"version"` literal. Pull that literal.
fn capture_after(haystack: &str, re: &Regex) -> Option<String> {
    let m = re.find(haystack)?;
    // The matched slice ends with `"<version>"`; take the last quoted token.
    let matched = &haystack[m.start()..m.end()];
    let end = matched.rfind('"')?;
    let start = matched[..end].rfind('"')? + 1;
    Some(matched[start..end].to_string())
}

/// The pinned `@ossido-labs/ossido` version from a `package.json`, or `None` for
/// a `workspace:*` dep (monorepo) or when absent.
pub fn package_json_ossido_version(package_json: &str) -> Option<String> {
    let v = PKG_OSSIDO_VERSION.captures(package_json)?[1].to_string();
    if v == "workspace:*" { None } else { Some(v) }
}

/// Rewrite the `ossido` crate dep in `Cargo.toml` to `target`, converting a path
/// dep to a pinned version and bumping an already-pinned plain or inline-table
/// version. Other deps (including `ossido_*` crates) are left untouched.
pub fn set_cargo_ossido_version(cargo_toml: &str, target: &str) -> String {
    // Path dep -> pinned string (this also feeds the plain-string pass below,
    // which is idempotent on the value we just wrote).
    let s = CARGO_PATH
        .replace(cargo_toml, format!("${{1}}\"{target}\"").as_str())
        .into_owned();
    // Inline table carrying a version -> bump just the version literal.
    let s = CARGO_OBJECT_VERSION
        .replace(&s, format!("${{1}}\"{target}\"").as_str())
        .into_owned();
    // Plain string dep -> bump.
    CARGO_PLAIN
        .replace(&s, format!("${{1}}\"{target}\"").as_str())
        .into_owned()
}

/// Rewrite every `@ossido-labs/*` dependency in `package.json` to `target`,
/// covering both `workspace:*` and an already-pinned semver value. The ossido
/// packages are versioned together, so they all move in lockstep.
pub fn set_package_json_ossido_versions(package_json: &str, target: &str) -> String {
    PKG_OSSIDO_DEP
        .replace_all(package_json, format!("\"${{1}}\": \"{target}\"").as_str())
        .into_owned()
}

/// Read `Cargo.toml` from `folder`, rewrite the `ossido` dep to `target`, write back.
pub fn rewrite_cargo_toml(folder: &Path, target: &str) -> io::Result<()> {
    let path = folder.join("Cargo.toml");
    let content = fs::read_to_string(&path)?;
    fs::write(&path, set_cargo_ossido_version(&content, target))
}

/// Read `package.json` from `folder`, rewrite `@ossido-labs/*` deps to `target`, write back.
pub fn rewrite_package_json(folder: &Path, target: &str) -> io::Result<()> {
    let path = folder.join("package.json");
    let content = fs::read_to_string(&path)?;
    fs::write(&path, set_package_json_ossido_versions(&content, target))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_plain_cargo_version() {
        let toml = "[dependencies]\nossido = \"0.1.4\"\nserde = \"1\"\n";
        assert_eq!(cargo_ossido_version(toml).as_deref(), Some("0.1.4"));
    }

    #[test]
    fn reads_object_cargo_version() {
        let toml = "[dependencies]\nossido = { version = \"0.1.4\", features = [\"x\"] }\n";
        assert_eq!(cargo_ossido_version(toml).as_deref(), Some("0.1.4"));
    }

    #[test]
    fn path_dep_has_no_version() {
        let toml = "[dependencies]\nossido = { path = \"../../crates/ossido\" }\n";
        assert_eq!(cargo_ossido_version(toml), None);
    }

    #[test]
    fn does_not_confuse_sibling_crates() {
        let toml = "[dependencies]\nossido_ssr = \"0.9.9\"\nossido = \"0.1.4\"\n";
        assert_eq!(cargo_ossido_version(toml).as_deref(), Some("0.1.4"));
    }

    #[test]
    fn reads_package_json_version() {
        let json = "{\n  \"dependencies\": { \"@ossido-labs/ossido\": \"0.1.4\" }\n}";
        assert_eq!(package_json_ossido_version(json).as_deref(), Some("0.1.4"));
    }

    #[test]
    fn workspace_dep_has_no_version() {
        let json = "{\n  \"dependencies\": { \"@ossido-labs/ossido\": \"workspace:*\" }\n}";
        assert_eq!(package_json_ossido_version(json), None);
    }

    #[test]
    fn bumps_plain_cargo_version() {
        let toml = "[dependencies]\nossido = \"0.1.4\"\nserde = \"1.0\"\n";
        let out = set_cargo_ossido_version(toml, "0.2.0");
        assert!(out.contains("ossido = \"0.2.0\""));
        assert!(out.contains("serde = \"1.0\""));
    }

    #[test]
    fn bumps_object_cargo_version_keeping_features() {
        let toml = "ossido = { version = \"0.1.4\", features = [\"ssr\"] }\n";
        let out = set_cargo_ossido_version(toml, "0.2.0");
        assert!(out.contains("version = \"0.2.0\""));
        assert!(out.contains("features = [\"ssr\"]"));
    }

    #[test]
    fn converts_path_dep_to_pinned() {
        let toml = "ossido = { path = \"../../crates/ossido\" }\n";
        let out = set_cargo_ossido_version(toml, "0.2.0");
        assert!(out.contains("ossido = \"0.2.0\""));
        assert!(!out.contains("path"));
    }

    #[test]
    fn leaves_sibling_crate_untouched_on_bump() {
        let toml = "ossido_ssr = \"0.1.4\"\nossido = \"0.1.4\"\n";
        let out = set_cargo_ossido_version(toml, "0.2.0");
        assert!(out.contains("ossido_ssr = \"0.1.4\""));
        assert!(out.contains("ossido = \"0.2.0\""));
    }

    #[test]
    fn converts_path_dep_on_single_line_manifest() {
        // Mirrors the scaffold mock in tests/utils/mock_github_endpoint.rs, where
        // the whole Cargo.toml is one line and `ossido` is not at line start.
        let toml = "[package] name = \"ossido-tutorial\" [dependencies] ossido = { path = \"../../crates/ossido/\" }";
        let out = set_cargo_ossido_version(toml, "0.1.4");
        assert_eq!(
            out,
            "[package] name = \"ossido-tutorial\" [dependencies] ossido = \"0.1.4\""
        );
    }

    #[test]
    fn bumps_all_ossido_labs_packages() {
        let json = "{\n  \"dependencies\": {\n    \"react\": \"^19.0.0\",\n    \"@ossido-labs/ossido\": \"workspace:*\"\n  },\n  \"devDependencies\": {\n    \"@ossido-labs/ossido-eslint-plugin\": \"0.1.4\"\n  }\n}";
        let out = set_package_json_ossido_versions(json, "0.2.0");
        assert!(out.contains("\"@ossido-labs/ossido\": \"0.2.0\""));
        assert!(out.contains("\"@ossido-labs/ossido-eslint-plugin\": \"0.2.0\""));
        // Non-ossido deps and the workspace name are untouched.
        assert!(out.contains("\"react\": \"^19.0.0\""));
    }
}
