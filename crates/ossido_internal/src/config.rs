use std::fs::read_to_string;
use std::io;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::log::{Level, LogFormat};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub origin: Option<String>,
    pub port: u16,
}

impl Default for ServerConfig {
    fn default() -> Self {
        ServerConfig {
            host: "localhost".to_string(),
            origin: None,
            port: 3000,
        }
    }
}

/// Forwarding of browser `console.*` to the dev server console (dev only).
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct BrowserLogConfig {
    pub enabled: bool,
    pub level: Level,
}

impl Default for BrowserLogConfig {
    fn default() -> Self {
        BrowserLogConfig {
            enabled: true,
            level: Level::Info,
        }
    }
}

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct LoggingConfig {
    #[serde(default)]
    pub format: LogFormat,
    /// Print the route tree on `ossido dev` start-up. Off by default; opt in with
    /// `logging.routeTree: true` in `ossido.config.ts`.
    #[serde(rename = "routeTree", default)]
    pub route_tree: bool,
    #[serde(default)]
    pub browser: BrowserLogConfig,
}

/// Build output mode, mirroring the TS `output` config option. Defaults to
/// [`OutputMode::Server`]; `static` statically generates the site.
#[derive(Deserialize, Serialize, Debug, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum OutputMode {
    #[default]
    Server,
    Static,
}

/// Server-side rendering config.
#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct SsrConfig {
    /// Number of dedicated V8 render-pool threads. `None` (unset) resolves to the
    /// machine's available parallelism at runtime; the `OSSIDO_SSR_THREADS` env
    /// var overrides this.
    #[serde(rename = "renderThreads", default)]
    pub render_threads: Option<usize>,
}

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct Config {
    pub server: ServerConfig,
    #[serde(default)]
    pub logging: LoggingConfig,
    #[serde(default)]
    pub ssr: SsrConfig,
    #[serde(default)]
    pub output: OutputMode,
    /// Override for which `.env` files are loaded, from the `env` option in
    /// `ossido.config.ts`. When present, these paths **replace** the default
    /// `.env`/`.env.local`/`.env.[mode]` cascade (loaded in order). `None` keeps
    /// the default cascade. The JS normalizer coerces a single string to a
    /// one-element array.
    #[serde(default)]
    pub env: Option<Vec<String>>,
}

impl Config {
    pub fn get() -> io::Result<Config> {
        let config_file = read_to_string(PathBuf::from_iter([".ossido", "config", "config.json"]))?;

        serde_json::from_str(&config_file)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_default() {
        let config = Config::default();

        assert_eq!(config.server.host, "localhost".to_string());
        assert_eq!(config.server.origin, None);
        assert_eq!(config.server.port, 3000);
        assert_eq!(config.ssr.render_threads, None);
        assert_eq!(config.output, OutputMode::Server);
    }

    #[test]
    fn deserializes_output_mode_and_defaults_to_server() {
        let base = r#"{ "server": { "host": "localhost", "port": 3000, "origin": null }"#;

        // Absent → defaults to server.
        let config: Config = serde_json::from_str(&format!("{base} }}")).unwrap();
        assert_eq!(config.output, OutputMode::Server);

        // Explicit static.
        let config: Config =
            serde_json::from_str(&format!("{base}, \"output\": \"static\" }}")).unwrap();
        assert_eq!(config.output, OutputMode::Static);

        // Explicit server.
        let config: Config =
            serde_json::from_str(&format!("{base}, \"output\": \"server\" }}")).unwrap();
        assert_eq!(config.output, OutputMode::Server);
    }

    #[test]
    fn deserializes_env_override_and_defaults_to_none() {
        let base = r#"{ "server": { "host": "localhost", "port": 3000, "origin": null }"#;

        // Absent → None (default cascade).
        let config: Config = serde_json::from_str(&format!("{base} }}")).unwrap();
        assert_eq!(config.env, None);

        // Array of paths (the shape the JS normalizer emits).
        let config: Config = serde_json::from_str(&format!(
            "{base}, \"env\": [\".env.shared\", \".env.secret\"] }}"
        ))
        .unwrap();
        assert_eq!(
            config.env,
            Some(vec![".env.shared".to_string(), ".env.secret".to_string()])
        );
    }

    #[test]
    fn deserializes_ssr_render_threads() {
        let config: Config = serde_json::from_str(
            r#"{ "server": { "host": "localhost", "port": 3000, "origin": null }, "ssr": { "renderThreads": 3 } }"#,
        )
        .unwrap();
        assert_eq!(config.ssr.render_threads, Some(3));
    }

    #[test]
    fn ssr_defaults_when_absent_or_null() {
        let base = r#"{ "server": { "host": "localhost", "port": 3000, "origin": null }"#;

        // Missing `ssr` entirely.
        let config: Config = serde_json::from_str(&format!("{base} }}")).unwrap();
        assert_eq!(config.ssr.render_threads, None);

        // Present but `renderThreads: null` (the shape the JS normalizer emits).
        let config: Config = serde_json::from_str(&format!(
            "{base}, \"ssr\": {{ \"renderThreads\": null }} }}"
        ))
        .unwrap();
        assert_eq!(config.ssr.render_threads, None);
    }
}
