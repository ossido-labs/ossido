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

fn default_true() -> bool {
    true
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct LoggingConfig {
    #[serde(default)]
    pub format: LogFormat,
    /// Print the route tree on `tuono dev` start-up.
    #[serde(rename = "routeTree", default = "default_true")]
    pub route_tree: bool,
    #[serde(default)]
    pub browser: BrowserLogConfig,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        LoggingConfig {
            format: LogFormat::default(),
            route_tree: true,
            browser: BrowserLogConfig::default(),
        }
    }
}

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct Config {
    pub server: ServerConfig,
    #[serde(default)]
    pub logging: LoggingConfig,
}

impl Config {
    pub fn get() -> io::Result<Config> {
        let config_file = read_to_string(PathBuf::from_iter([".tuono", "config", "config.json"]))?;

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
    }
}
