use std::collections::HashSet;
use std::sync::OnceLock;
use std::{env, fs};

use serde_json::value::RawValue;

use crate::mode::Mode;

/// The public environment variables (the `#[public]` fields of a project's
/// `#[ossido::Environment]` struct) serialized as a JSON object, registered once
/// at startup by the generated `main.rs`. `None` when the project defines no
/// `Environment` struct — in which case no env global is injected and the
/// frontend `getEnv` throws.
static PUBLIC_ENV_JSON: OnceLock<Box<RawValue>> = OnceLock::new();

/// Register the public environment JSON produced by
/// `Environment::__ossido_public_env_json`. Called once from the generated
/// `main.rs` after `.env` files are loaded. A malformed value is ignored (it can
/// only be produced by a framework bug, never by user input).
pub fn register_public_env(json: String) {
    if let Ok(raw) = RawValue::from_string(json) {
        let _ = PUBLIC_ENV_JSON.set(raw);
    }
}

/// The registered public environment JSON, embedded verbatim into the SSR
/// payload. `None` when the project has no `Environment` struct.
pub fn public_env_json() -> Option<&'static RawValue> {
    PUBLIC_ENV_JSON.get().map(|raw| raw.as_ref())
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
pub fn bootstrap(mode: Mode, public_env: Option<fn() -> String>) {
    let override_files = ossido_internal::config::Config::get()
        .ok()
        .and_then(|config| config.env);
    unsafe {
        // Safe here: runs at the very top of `main`, before app state or request
        // handling, so nothing else is touching the OS environment concurrently.
        load_env_vars(mode, override_files.as_deref());
    }

    if let Some(public_env_json) = public_env {
        register_public_env(public_env_json());
    }
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
    let env_files = match override_files {
        Some(files) => files.to_vec(),
        None => {
            let mut env_files = vec![String::from(".env"), String::from(".env.local")];

            let mode_name = match mode {
                Mode::Dev => "development",
                Mode::Prod => "production",
            };

            env_files.push(format!(".env.{mode_name}"));
            env_files.push(String::from(".env.local"));
            env_files.push(format!(".env.{mode_name}.local"));
            env_files
        }
    };

    let system_env_names: HashSet<String> = env::vars().map(|(k, _)| k).collect();

    for env_file in env_files {
        if let Ok(contents) = fs::read_to_string(env_file) {
            for line in contents.lines() {
                if let Some((key, mut value)) = line.split_once('=') {
                    if value.starts_with('"') && value.ends_with('"') {
                        value = &value[1..value.len() - 1];
                    }

                    let key = key.trim().to_string();
                    let value = value.trim().to_string();

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
