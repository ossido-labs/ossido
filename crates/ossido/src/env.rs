use std::collections::{HashMap, HashSet};
use std::sync::{OnceLock, RwLock};
use std::{env, fs};

use serde_json::value::RawValue;

use crate::mode::Mode;

/// The public environment variables (the `#[public]` fields of a project's
/// `#[ossido::Environment]` struct) serialized as a JSON object, registered at
/// startup by the generated `main.rs`. `None` when the project defines no
/// `Environment` struct — in which case no env global is injected and the
/// frontend `getEnv` throws.
///
/// Behind a `RwLock` (not a `OnceLock`) so the dev-mode `.env` watcher can swap
/// in a fresh value when a loaded file changes, and in-flight renders read a
/// snapshot via [`public_env_json`].
static PUBLIC_ENV_JSON: RwLock<Option<Box<RawValue>>> = RwLock::new(None);

/// The environment variable names present in the OS environment *before* any
/// `.env` file was loaded. Captured once at [`bootstrap`]; used by the reload
/// path so real system variables keep precedence over `.env` values across
/// reloads (a fresh snapshot per reload would wrongly treat previously-loaded
/// `.env` vars as "system").
static SYSTEM_ENV_BASELINE: OnceLock<HashSet<String>> = OnceLock::new();

/// Rebuilds the typed `Environment` singleton from a resolved var map and returns
/// its new public-env JSON. Generated in `main.rs` (it knows the concrete
/// `Environment` type) and handed to [`bootstrap`] so the framework's watcher can
/// trigger an in-process reload.
pub type EnvReload = fn(&HashMap<String, String>) -> String;

/// Register (or replace) the public environment JSON produced by
/// `Environment::__ossido_public_env_json`. Called at startup and again by the
/// dev watcher on reload. A malformed value is ignored (it can only be produced
/// by a framework bug, never by user input).
pub fn register_public_env(json: String) {
    if let Ok(raw) = RawValue::from_string(json)
        && let Ok(mut guard) = PUBLIC_ENV_JSON.write()
    {
        *guard = Some(raw);
    }
}

/// A snapshot of the registered public environment JSON, embedded verbatim into
/// the SSR payload. `None` when the project has no `Environment` struct. Returns
/// an owned clone so a concurrent reload can swap the stored value freely.
pub fn public_env_json() -> Option<Box<RawValue>> {
    PUBLIC_ENV_JSON.read().ok().and_then(|guard| guard.clone())
}

/// Backing helper for the two-argument [`get_env!`](crate::get_env) form:
/// collapse an `Option<T>` field to a concrete `T`, using `fallback` when the
/// variable is unset. Restricted to `Option<T>` inputs, so passing a fallback
/// for a required (non-`Option`) field is a type error — a fallback there would
/// be meaningless.
#[doc(hidden)]
pub fn __env_or<T>(value: Option<T>, fallback: T) -> T {
    value.unwrap_or(fallback)
}

/// Prepare the environment at the very start of the generated `main.rs`, before
/// anything else:
///
/// 1. Load the project's `.env` files into the OS environment (honoring the
///    `env` override in `ossido.config.ts`).
/// 2. If the project defines an `#[ossido::Environment]` struct, parse it now
///    (fail-fast on a missing/invalid required var) and register its public
///    fields for SSR injection. `public_env` is `Some(Environment::__ossido_public_env_json)`
///    when the struct exists, `None` otherwise.
///
/// Running before the app-state initializer means `app.rs` can build
/// `ApplicationState` utilities from `get_env!` / `std::env::var`.
pub fn bootstrap(mode: Mode, public_env: Option<fn() -> String>, reload: Option<EnvReload>) {
    let override_files = ossido_internal::config::Config::get()
        .ok()
        .and_then(|config| config.env);

    // Capture the true system environment *before* loading any `.env` file, so
    // reloads can keep system vars ahead of `.env` values.
    let _ = SYSTEM_ENV_BASELINE.set(env::vars().map(|(key, _)| key).collect());

    let files = resolved_env_files(mode, override_files.as_deref());

    unsafe {
        // Safe here: runs at the very top of `main`, before app state or request
        // handling, so nothing else is touching the OS environment concurrently.
        load_env_vars(mode, override_files.as_deref());
    }

    if let Some(public_env_json) = public_env {
        register_public_env(public_env_json());
    }

    // In dev, watch the loaded files and re-ingest in-process on change. Only
    // meaningful when an `#[ossido::Environment]` struct exists (it owns the
    // swappable singleton + public-env JSON that a reload updates); `get_env!`
    // and the SSR public env update live, while raw `std::env::var` reads are
    // intentionally left untouched (mutating process env in a live server is
    // unsound).
    if mode == Mode::Dev
        && let Some(reload) = reload
    {
        spawn_env_watcher(files, reload);
    }
}

/// The ordered list of `.env` files [`load_env_vars`] would read: the config
/// `env` override verbatim, otherwise the default cascade for `mode`.
pub fn resolved_env_files(mode: Mode, override_files: Option<&[String]>) -> Vec<String> {
    match override_files {
        Some(files) => files.to_vec(),
        None => {
            let mode_name = match mode {
                Mode::Dev => "development",
                Mode::Prod => "production",
            };
            vec![
                String::from(".env"),
                String::from(".env.local"),
                format!(".env.{mode_name}"),
                String::from(".env.local"),
                format!(".env.{mode_name}.local"),
            ]
        }
    }
}

/// Parse one `KEY=VALUE` line into a trimmed `(key, value)`, stripping matching
/// surrounding double quotes from the value. `None` for blank/comment/malformed
/// lines.
fn parse_env_line(line: &str) -> Option<(String, String)> {
    let (key, value) = line.split_once('=')?;
    let key = key.trim();
    let mut value = value.trim();
    if value.len() >= 2 && value.starts_with('"') && value.ends_with('"') {
        value = &value[1..value.len() - 1];
    }
    Some((key.to_string(), value.to_string()))
}

/// Resolve the effective variable map for a reload, without touching the OS
/// environment: the `.env` cascade (later files win), with real system variables
/// (the [`SYSTEM_ENV_BASELINE`]) overlaid so they keep precedence.
fn build_resolved_map(files: &[String]) -> HashMap<String, String> {
    let baseline = SYSTEM_ENV_BASELINE.get();
    let mut map = HashMap::new();

    for file in files {
        if let Ok(contents) = fs::read_to_string(file) {
            for line in contents.lines() {
                if let Some((key, value)) = parse_env_line(line) {
                    // A real system variable always wins; don't let a `.env`
                    // value shadow it.
                    if baseline.is_some_and(|names| names.contains(&key)) {
                        continue;
                    }
                    map.insert(key, value);
                }
            }
        }
    }

    // Overlay the system values so the rebuilt `Environment` sees them.
    if let Some(names) = baseline {
        for key in names {
            if let Ok(value) = env::var(key) {
                map.insert(key.clone(), value);
            }
        }
    }

    map
}

/// Spawn a dev-only background thread that polls the modification times of the
/// loaded `.env` files and, on any change (including create/delete), rebuilds the
/// resolved map, re-parses the `Environment` (via `reload`), and re-registers its
/// public JSON — all in-process, no restart.
fn spawn_env_watcher(files: Vec<String>, reload: EnvReload) {
    use std::time::{Duration, SystemTime};

    /// The current modification time of each file, `None` when it doesn't exist.
    fn snapshot(files: &[String]) -> Vec<Option<SystemTime>> {
        files
            .iter()
            .map(|file| fs::metadata(file).and_then(|meta| meta.modified()).ok())
            .collect()
    }

    std::thread::Builder::new()
        .name("ossido-env-watch".into())
        .spawn(move || {
            let mut last = snapshot(&files);
            loop {
                std::thread::sleep(Duration::from_millis(500));
                let current = snapshot(&files);
                if current == last {
                    continue;
                }
                last = current;

                let map = build_resolved_map(&files);
                // A bad edit (e.g. a now-missing required var) makes the
                // generated builder panic; contain it so the watcher survives and
                // the previous env stays in effect.
                match std::panic::catch_unwind(|| reload(&map)) {
                    Ok(public_json) => {
                        register_public_env(public_json);
                        eprintln!("[ossido] reloaded environment from .env change");
                    }
                    Err(_) => {
                        eprintln!(
                            "[ossido] .env change ignored: environment failed to parse (keeping previous values)"
                        );
                    }
                }
            }
        })
        .ok();
}

/// Read the env variables from the .env files
/// and set them in the OS env
///
/// When `override_files` is `Some`, those paths are loaded verbatim (in order)
/// instead of the default `.env` cascade — the `env` option in `ossido.config.ts`.
///
/// This function is unsafe because it modifies the OS env variables (which needs
/// to be done in a single-threaded context).
pub unsafe fn load_env_vars(mode: Mode, override_files: Option<&[String]>) {
    let env_files = resolved_env_files(mode, override_files);

    let system_env_names: HashSet<String> = env::vars().map(|(k, _)| k).collect();

    for env_file in env_files {
        if let Ok(contents) = fs::read_to_string(env_file) {
            for line in contents.lines() {
                if let Some((key, value)) = parse_env_line(line) {
                    if system_env_names.contains(&key) {
                        continue; // Skip if key exists in system env
                    }

                    unsafe {
                        env::set_var(key, value);
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::{env, fs};

    use serial_test::serial;

    use super::*;
    use crate::mode::Mode;

    #[test]
    fn env_or_returns_value_when_present_else_fallback() {
        assert_eq!(__env_or(Some(3u16), 9), 3);
        assert_eq!(__env_or(None, 9u16), 9);
        assert_eq!(__env_or(Some(String::from("x")), String::from("d")), "x");
        assert_eq!(__env_or(None::<String>, String::from("d")), "d");
    }

    struct MockEnv {
        files: Vec<String>,
        vars: HashMap<String, String>,
    }

    impl MockEnv {
        fn new() -> Self {
            Self {
                files: Vec::new(),
                vars: HashMap::new(),
            }
        }

        fn add_system_var(&mut self, k: &str, v: &str) {
            self.vars.insert(k.to_string(), v.to_string());
            unsafe {
                env::set_var(k, v);
            }
        }

        pub fn setup_env_file(&mut self, file_name: &str, contents: &str) {
            self.files.push(file_name.to_string());
            fs::write(file_name, contents).expect("Failed to write test .env file");
        }

        pub fn capture_keys(&mut self, keys: &[&str]) {
            for key in keys {
                if let Ok(val) = env::var(key) {
                    self.vars.insert(key.to_string(), val);
                }
            }
        }
    }

    impl Drop for MockEnv {
        fn drop(&mut self) {
            for file in self.files.iter() {
                let _ = fs::remove_file(file.as_str());
            }
            for key in self.vars.keys() {
                unsafe {
                    env::remove_var(key);
                }
            }
        }
    }

    #[test]
    #[serial]
    fn test_system_env_var_precedence() {
        let mut mock_env = MockEnv::new();

        mock_env.add_system_var("TEST_KEY", "system_value");
        mock_env.setup_env_file(".env", "TEST_KEY=file_value");

        unsafe {
            load_env_vars(Mode::Dev, None);
        }

        mock_env.capture_keys(&["TEST_KEY"]);

        assert_eq!(env::var("TEST_KEY").unwrap(), "system_value");
    }

    #[test]
    #[serial]
    fn test_mode_specific_env_var_precedence_dev() {
        let mut mock_env = MockEnv::new();

        mock_env.setup_env_file(".env", "TEST_KEY=base_value");
        mock_env.setup_env_file(".env.development", "TEST_KEY=development_value");

        unsafe {
            load_env_vars(Mode::Dev, None);
        }

        mock_env.capture_keys(&["TEST_KEY"]);

        assert_eq!(env::var("TEST_KEY").unwrap(), "development_value");
    }

    #[test]
    #[serial]
    fn test_mode_specific_env_var_precedence_prod() {
        let mut mock_env = MockEnv::new();

        mock_env.setup_env_file(".env", "TEST_KEY=base_value");
        mock_env.setup_env_file(".env.production", "TEST_KEY=production_value");

        unsafe {
            load_env_vars(Mode::Prod, None);
        }

        mock_env.capture_keys(&["TEST_KEY"]);

        assert_eq!(env::var("TEST_KEY").unwrap(), "production_value");
    }

    #[test]
    #[serial]
    fn test_local_env_var_precedence() {
        let mut mock_env = MockEnv::new();

        mock_env.setup_env_file(".env", "TEST_KEY=base_value");
        mock_env.setup_env_file(".env.local", "TEST_KEY=local_value");

        unsafe {
            load_env_vars(Mode::Dev, None);
        }

        mock_env.capture_keys(&["TEST_KEY"]);

        assert_eq!(env::var("TEST_KEY").unwrap(), "local_value");
    }

    #[test]
    #[serial]
    fn test_mode_local_env_var_precedence_dev() {
        let mut mock_env = MockEnv::new();

        mock_env.setup_env_file(".env", "TEST_KEY=base_value");
        mock_env.setup_env_file(".env.development", "TEST_KEY=development_value");
        mock_env.setup_env_file(".env.development.local", "TEST_KEY=local_dev_value");

        unsafe {
            load_env_vars(Mode::Dev, None);
        }

        mock_env.capture_keys(&["TEST_KEY"]);

        assert_eq!(env::var("TEST_KEY").unwrap(), "local_dev_value");
    }

    #[test]
    #[serial]
    fn test_mode_local_env_var_precedence_prod() {
        let mut mock_env = MockEnv::new();

        mock_env.setup_env_file(".env", "TEST_KEY=base_value");
        mock_env.setup_env_file(".env.production", "TEST_KEY=production_value");
        mock_env.setup_env_file(".env.production.local", "TEST_KEY=local_prod_value");

        unsafe {
            load_env_vars(Mode::Prod, None);
        }

        mock_env.capture_keys(&["TEST_KEY"]);

        assert_eq!(env::var("TEST_KEY").unwrap(), "local_prod_value");
    }

    #[test]
    #[serial]
    fn test_ignores_files_from_other_mode() {
        let mut mock_env = MockEnv::new();

        mock_env.setup_env_file(".env.development", "TEST_KEY=development_value");
        mock_env.setup_env_file(".env.production", "TEST_KEY=production_value");

        unsafe {
            load_env_vars(Mode::Prod, None);
        }

        mock_env.capture_keys(&["TEST_KEY"]);

        assert_eq!(env::var("TEST_KEY").unwrap(), "production_value");
    }

    #[test]
    #[serial]
    fn test_empty_env_file() {
        let mut mock_env = MockEnv::new();

        mock_env.setup_env_file(".env", "");

        unsafe {
            load_env_vars(Mode::Dev, None);
        }

        assert!(env::var("NON_EXISTENT_KEY").is_err());
    }

    #[test]
    #[serial]
    fn test_malformed_env_entries() {
        let mut mock_env = MockEnv::new();

        mock_env.setup_env_file(".env", "INVALID_LINE\nMISSING_EQUALS_SIGN");
        unsafe {
            load_env_vars(Mode::Dev, None);
        }

        mock_env.capture_keys(&["INVALID_LINE", "MISSING_EQUALS_SIGN"]);

        assert!(env::var("INVALID_LINE").is_err());
        assert!(env::var("MISSING_EQUALS_SIGN").is_err());
    }

    #[test]
    #[serial]
    fn test_quoted_values_parsing() {
        let mut mock_env = MockEnv::new();

        mock_env.setup_env_file(".env", r#"TEST_KEY="quoted_value""#);

        unsafe {
            load_env_vars(Mode::Dev, None);
        }

        mock_env.capture_keys(&["TEST_KEY"]);

        assert_eq!(env::var("TEST_KEY").unwrap(), "quoted_value");
    }

    #[test]
    #[serial]
    fn test_non_existent_env_file() {
        let mut mock_env = MockEnv::new();
        unsafe {
            load_env_vars(Mode::Dev, None);
        }

        mock_env.capture_keys(&["NON_EXISTENT_KEY"]);

        assert!(env::var("NON_EXISTENT_KEY").is_err());
    }

    #[test]
    #[serial]
    fn test_multiple_env_vars() {
        let mut mock_env = MockEnv::new();

        mock_env.setup_env_file(".env", "KEY1=value1\nKEY2=value2");

        unsafe {
            load_env_vars(Mode::Dev, None);
        }

        mock_env.capture_keys(&["KEY1", "KEY2"]);

        assert_eq!(env::var("KEY1").unwrap(), "value1");
        assert_eq!(env::var("KEY2").unwrap(), "value2");
    }

    #[test]
    #[serial]
    fn test_override_files_replace_the_default_cascade() {
        let mut mock_env = MockEnv::new();

        // The default `.env` must be ignored when an override list is given.
        mock_env.setup_env_file(".env", "OVERRIDE_KEY=from_default");
        mock_env.setup_env_file(".env.custom", "OVERRIDE_KEY=from_custom");

        unsafe {
            load_env_vars(Mode::Dev, Some(&[String::from(".env.custom")]));
        }

        mock_env.capture_keys(&["OVERRIDE_KEY"]);

        assert_eq!(env::var("OVERRIDE_KEY").unwrap(), "from_custom");
    }

    #[test]
    fn parse_env_line_trims_and_strips_quotes() {
        assert_eq!(
            parse_env_line("KEY=value"),
            Some(("KEY".to_string(), "value".to_string()))
        );
        assert_eq!(
            parse_env_line("  KEY = \"quoted value\" "),
            Some(("KEY".to_string(), "quoted value".to_string()))
        );
        // No `=` → not a variable line.
        assert_eq!(parse_env_line("JUST_A_COMMENT"), None);
    }

    #[test]
    #[serial]
    fn build_resolved_map_applies_cascade_order() {
        let mut mock_env = MockEnv::new();
        // Later files win for the same key (matching the load cascade).
        mock_env.setup_env_file(".env.a", "SHARED=from_a\nONLY_A=a");
        mock_env.setup_env_file(".env.b", r#"SHARED="from_b""#);

        let map = build_resolved_map(&[String::from(".env.a"), String::from(".env.b")]);

        assert_eq!(map.get("SHARED").map(String::as_str), Some("from_b"));
        assert_eq!(map.get("ONLY_A").map(String::as_str), Some("a"));
        // A key absent from all files is absent from the map (so a removed var
        // reads as `None` on reload rather than a stale value).
        assert!(!map.contains_key("MISSING_KEY"));
    }

    #[test]
    #[serial]
    fn test_override_files_are_loaded_in_order() {
        let mut mock_env = MockEnv::new();

        // Loaded in order; a later file overrides an earlier one for the same key
        // (matching the default cascade, where `.env.{mode}` overrides `.env`).
        mock_env.setup_env_file(".env.first", "ORDER_KEY=first");
        mock_env.setup_env_file(".env.second", "ORDER_KEY=second");

        unsafe {
            load_env_vars(
                Mode::Dev,
                Some(&[String::from(".env.first"), String::from(".env.second")]),
            );
        }

        mock_env.capture_keys(&["ORDER_KEY"]);

        assert_eq!(env::var("ORDER_KEY").unwrap(), "second");
    }
}
