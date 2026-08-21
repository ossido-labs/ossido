//! Registry lookups for the latest published ossido version, plus a tiny semver
//! comparison. Used by `doctor` (is the project behind?) and `upgrade` (resolve
//! the default target). crates.io is the source of truth; npm is a fallback.

use std::env;

use reqwest::blocking::Client;
use serde::Deserialize;

const CRATES_IO_BASE: &str = "https://crates.io";
const NPM_BASE: &str = "https://registry.npmjs.org";

#[derive(Deserialize)]
struct CratesIoResponse {
    #[serde(rename = "crate")]
    krate: CrateInfo,
}

#[derive(Deserialize)]
struct CrateInfo {
    /// Preferred: the latest non-yanked, non-prerelease version.
    max_stable_version: Option<String>,
    /// Fallback when there is no stable release yet.
    max_version: String,
}

#[derive(Deserialize)]
struct NpmResponse {
    #[serde(rename = "dist-tags")]
    dist_tags: NpmDistTags,
}

#[derive(Deserialize)]
struct NpmDistTags {
    latest: String,
}

/// A blocking client with a real User-Agent — crates.io rejects requests that
/// send an empty one (unlike the GitHub client in `new.rs`).
fn client() -> Option<Client> {
    Client::builder()
        .user_agent(concat!("ossido-cli/", env!("CARGO_PKG_VERSION")))
        .build()
        .ok()
}

/// The registry base URLs, overridable via `__INTERNAL_OSSIDO_TEST` so tests can
/// point both at a single wiremock server (mirrors `new.rs`'s GitHub override).
/// Returns `(crates_io_base, npm_base)`.
fn registry_bases() -> (String, String) {
    match env::var("__INTERNAL_OSSIDO_TEST") {
        Ok(base) => (base.clone(), base),
        Err(_) => (CRATES_IO_BASE.to_string(), NPM_BASE.to_string()),
    }
}

/// Latest `ossido` crate version on crates.io, or `None` on any failure.
pub fn latest_crate_version(client: &Client, base: &str) -> Option<String> {
    let url = format!("{base}/api/v1/crates/ossido");
    let res = client.get(url).send().ok()?;
    if !res.status().is_success() {
        return None;
    }
    let body: CratesIoResponse = res.json().ok()?;
    Some(
        body.krate
            .max_stable_version
            .unwrap_or(body.krate.max_version),
    )
}

/// Latest `@ossido-labs/ossido` version on npm, or `None` on any failure.
pub fn latest_npm_version(client: &Client, base: &str) -> Option<String> {
    let url = format!("{base}/@ossido-labs/ossido");
    let res = client.get(url).send().ok()?;
    if !res.status().is_success() {
        return None;
    }
    let body: NpmResponse = res.json().ok()?;
    Some(body.dist_tags.latest)
}

/// The version both commands should treat as "latest". crates.io first, npm
/// fallback. `offline` short-circuits to `None` without touching the network.
pub fn latest_version(offline: bool) -> Option<String> {
    if offline {
        return None;
    }
    let client = client()?;
    let (crates_base, npm_base) = registry_bases();
    latest_crate_version(&client, &crates_base).or_else(|| latest_npm_version(&client, &npm_base))
}

/// A `major.minor.patch` version for ordering. Pre-release / build metadata is
/// ignored — enough for "is the project behind?" and the toolchain floor gate.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Version {
    pub major: u64,
    pub minor: u64,
    pub patch: u64,
}

/// Parse `X.Y.Z` (a leading `v` and any `-pre`/`+build` suffix are stripped).
pub fn parse_version(s: &str) -> Option<Version> {
    let s = s.trim().trim_start_matches('v');
    // Drop pre-release / build metadata before splitting on '.'.
    let core = s.split(['-', '+']).next().unwrap_or(s);
    let mut parts = core.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts.next().unwrap_or("0").parse().ok()?;
    Some(Version {
        major,
        minor,
        patch,
    })
}

/// Whether `current` is an older version than `latest`. Unparseable input is
/// treated as "not behind" so callers never nag on garbage.
pub fn is_behind(current: &str, latest: &str) -> bool {
    match (parse_version(current), parse_version(latest)) {
        (Some(c), Some(l)) => c < l,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_plain_and_prefixed() {
        assert_eq!(
            parse_version("0.1.4"),
            Some(Version {
                major: 0,
                minor: 1,
                patch: 4
            })
        );
        assert_eq!(
            parse_version("v1.85.0"),
            Some(Version {
                major: 1,
                minor: 85,
                patch: 0
            })
        );
    }

    #[test]
    fn parses_two_component_and_prerelease() {
        assert_eq!(
            parse_version("1.98"),
            Some(Version {
                major: 1,
                minor: 98,
                patch: 0
            })
        );
        assert_eq!(
            parse_version("0.2.0-beta.1"),
            Some(Version {
                major: 0,
                minor: 2,
                patch: 0
            })
        );
    }

    #[test]
    fn rejects_garbage() {
        assert_eq!(parse_version("not-a-version"), None);
        assert_eq!(parse_version(""), None);
    }

    #[test]
    fn orders_versions() {
        assert!(is_behind("0.1.3", "0.1.4"));
        assert!(is_behind("0.1.4", "0.2.0"));
        assert!(!is_behind("0.1.4", "0.1.4"));
        assert!(!is_behind("0.2.0", "0.1.4"));
        assert!(!is_behind("garbage", "0.1.4"));
    }

    #[test]
    fn parses_crates_io_body() {
        let json = r#"{"crate":{"max_stable_version":"0.1.4","max_version":"0.2.0-beta.1"}}"#;
        let body: CratesIoResponse = serde_json::from_str(json).unwrap();
        assert_eq!(
            body.krate
                .max_stable_version
                .unwrap_or(body.krate.max_version),
            "0.1.4"
        );
    }

    #[test]
    fn parses_crates_io_body_without_stable() {
        let json = r#"{"crate":{"max_stable_version":null,"max_version":"0.2.0-beta.1"}}"#;
        let body: CratesIoResponse = serde_json::from_str(json).unwrap();
        assert_eq!(
            body.krate
                .max_stable_version
                .unwrap_or(body.krate.max_version),
            "0.2.0-beta.1"
        );
    }

    #[test]
    fn parses_npm_body() {
        let json = r#"{"dist-tags":{"latest":"0.1.4"},"name":"@ossido-labs/ossido"}"#;
        let body: NpmResponse = serde_json::from_str(json).unwrap();
        assert_eq!(body.dist_tags.latest, "0.1.4");
    }
}
