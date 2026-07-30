use std::collections::HashMap;
use std::collections::hash_map::Entry;
use std::collections::hash_set::HashSet;
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};

use glob::{GlobError, glob};
use http::Method;
use tracing::error;
use tuono_internal::config::Config;
use tuono_internal::log::{self, Level};

use crate::mode::Mode;
use crate::route::Route;
use crate::route_directory_info::RouteDirectoryInfo;

pub const IGNORE_EXTENSIONS: [&str; 3] = ["css", "scss", "sass"];
// The file that marks a route (its URL is the containing directory).
pub const PAGE_FILENAME: &str = "page";
// The layout component/handler filename. `layout.tsx` is a client-only wrapper
// component; `layout.rs` is its optional server data handler.
pub const LAYOUT_FILENAME: &str = "layout";
// The middleware filename. It is collected via the middleware path (its `#[middleware]`
// functions become tower layers), never as a route — not even under `/api/`.
pub const MIDDLEWARE_FILENAME: &str = "middleware";
/// Whether an entry under `src/routes` is a collectible route: a `page.*` leaf,
/// a `layout.rs` data handler, or an API handler. Everything else (special
/// files, colocated components, `layout.tsx`) is ignored. Shared by both
/// collection paths (`App` and `RouteDirectoryInfo`).
pub fn is_collectible_route(entry: &Path, base_path: &Path) -> bool {
    let Some(extension) = entry.extension() else {
        return false;
    };
    if IGNORE_EXTENSIONS.iter().any(|val| val == &extension) {
        return false;
    }
    let Some(file_name) = entry.file_stem() else {
        return false;
    };

    if file_name == PAGE_FILENAME {
        return true;
    }
    // Only the `.rs` layout is a route (a server data handler); `layout.tsx` is
    // a client-only component rendered through the route tree.
    if file_name == LAYOUT_FILENAME && extension == "rs" {
        return true;
    }
    // `middleware.rs` is collected via the middleware path, not as a route —
    // even under `/api/`, where `is_api_path` would otherwise match it and it
    // would wrongly appear in `route_map` / the route tree.
    if file_name == MIDDLEWARE_FILENAME {
        return false;
    }
    is_api_path(entry, base_path)
}

/// Whether an entry sits under the top-level `api` directory (API handlers keep
/// arbitrary filenames rather than the `page` convention).
pub fn is_api_path(entry: &Path, base_path: &Path) -> bool {
    let base_path_str = base_path.to_string_lossy();
    entry
        .to_str()
        .unwrap_or_default()
        .replace(&format!("{base_path_str}{ROUTES_FOLDER_PATH}"), "")
        .replace('\\', "/")
        .starts_with("/api/")
}

/// Whether `port` can be bound on every address `host:port` resolves to. Binding
/// each resolved address (not just the first that succeeds) detects a conflict
/// regardless of the IPv4/IPv6 family the port is held on.
fn port_is_available(host: &str, port: u16) -> bool {
    use std::net::{TcpListener, ToSocketAddrs};
    match format!("{host}:{port}").to_socket_addrs() {
        Ok(mut addrs) => addrs.all(|addr| TcpListener::bind(addr).is_ok()),
        // Resolution failed — best-effort single bind; the server bind is the
        // backstop.
        Err(_) => TcpListener::bind(format!("{host}:{port}")).is_ok(),
    }
}

#[cfg(target_os = "windows")]
pub const ROUTES_FOLDER_PATH: &str = "\\src\\routes";
#[cfg(target_os = "windows")]
const BUILD_JS_SCRIPT: &str = ".\\node_modules\\.bin\\tuono-build-prod.cmd";

#[cfg(target_os = "windows")]
const BUILD_TUONO_CONFIG: &str = ".\\node_modules\\.bin\\tuono-build-config.cmd";

#[cfg(not(target_os = "windows"))]
pub const ROUTES_FOLDER_PATH: &str = "/src/routes";
#[cfg(not(target_os = "windows"))]
const BUILD_JS_SCRIPT: &str = "./node_modules/.bin/tuono-build-prod";

#[cfg(not(target_os = "windows"))]
const BUILD_TUONO_CONFIG: &str = "./node_modules/.bin/tuono-build-config";

#[derive(Debug, Clone)]
pub struct App {
    pub route_map: HashMap<String, Route>,
    pub base_path: PathBuf,
    pub has_app_state: bool,
    /// Whether `app.rs`'s `main` is `async` — the generated code only `.await`s
    /// the state initialiser when it is.
    pub app_state_is_async: bool,
    pub config: Option<Config>,
    pub route_directory_info: RouteDirectoryInfo,
}

/// The `app.rs` state initialiser: whether a `pub … fn main` exists and, if so,
/// whether it is `async` (so the generated code knows whether to `.await` it).
struct AppStateInit {
    present: bool,
    is_async: bool,
}

fn detect_app_state(base_path: &Path) -> AppStateInit {
    let none = AppStateInit {
        present: false,
        is_async: false,
    };

    let Ok(contents) = std::fs::read_to_string(base_path.join("src/app.rs")) else {
        return none;
    };

    // Parse the file and inspect the `pub fn main` signature directly, so
    // formatting (spacing, comments, attributes) can't fool the detection.
    let Ok(file) = syn::parse_file(&contents) else {
        return none;
    };

    file.items
        .iter()
        .find_map(|item| match item {
            syn::Item::Fn(func)
                if func.sig.ident == "main" && matches!(func.vis, syn::Visibility::Public(_)) =>
            {
                Some(AppStateInit {
                    present: true,
                    is_async: func.sig.asyncness.is_some(),
                })
            }
            _ => None,
        })
        .unwrap_or(none)
}

impl App {
    pub fn new() -> Self {
        let base_path = std::env::current_dir().expect("Failed to read current_dir");
        let base_path_str = base_path.to_string_lossy();
        let routes_path_str = format!("{base_path_str}{ROUTES_FOLDER_PATH}");
        let routes_path = Path::new(&routes_path_str);
        let app_state = detect_app_state(&base_path);
        let mut app = App {
            route_map: HashMap::new(),
            base_path: base_path.clone(),
            has_app_state: app_state.present,
            app_state_is_async: app_state.is_async,
            config: None,
            route_directory_info: RouteDirectoryInfo::new(routes_path).unwrap_or_default(),
        };

        app.collect_routes();

        app
    }

    pub fn collect_routes(&mut self) {
        glob(
            self.base_path
                .join("src/routes/**/*.*")
                .to_str()
                .expect("Failed to glob routes folder"),
        )
        .expect("Failed to read glob pattern")
        .for_each(|entry| {
            if self.should_collect_route(&entry) {
                self.collect_route(entry)
            }
        })
    }

    fn should_collect_route(&self, entry: &Result<PathBuf, GlobError>) -> bool {
        is_collectible_route(entry.as_ref().unwrap(), &self.base_path)
    }

    fn collect_route(&mut self, path_buf: Result<PathBuf, GlobError>) {
        let entry = path_buf.expect("Failed to read glob path");

        let base_path_str = self
            .base_path
            .to_str()
            .expect("Failed to read as str base_path");
        let path = entry
            .to_str()
            .expect("Failed to read entry as str")
            .replace(&format!("{base_path_str}{ROUTES_FOLDER_PATH}"), "")
            // Cleanup windows paths
            .replace("\\", "/")
            .replace(".rs", "")
            .replace(".mdx", "")
            .replace(".tsx", "");

        if entry.extension().expect("failed to read entry extension") == "rs" {
            if let Entry::Vacant(route_map) = self.route_map.entry(path.clone()) {
                let mut route = Route::new(path);
                route.update_axum_info();
                route_map.insert(route);
            } else {
                let route = self.route_map.get_mut(&path).unwrap();
                route.update_axum_info();
            }
            return;
        }
        if let Entry::Vacant(route_map) = self.route_map.entry(path.clone()) {
            let route = Route::new(path);
            route_map.insert(route);
        }
    }

    pub fn has_dynamic_routes(&self) -> bool {
        self.route_map.iter().any(|(_, route)| route.is_dynamic)
    }

    pub fn check_server_availability(&self, mode: Mode) {
        // At this point the config should be available
        let config = self.config.as_ref().unwrap();

        // The rust server, plus the vite dev server on `port + 1` in dev.
        let mut ports = vec![config.server.port];
        if mode == Mode::Dev {
            ports.push(config.server.port + 1);
        }

        for port in ports {
            if !port_is_available(&config.server.host, port) {
                log::backend(
                    Level::Error,
                    format!(
                        "Port {port} is already in use. Stop the process using it, or set a different `server.port` in tuono.config.ts."
                    ),
                );
                std::process::exit(1);
            }
        }
    }

    pub fn build_react_prod(&self) {
        if !Path::new(BUILD_JS_SCRIPT).exists() {
            error!("Failed to find the build script. Please run `npm install`");
            std::process::exit(1);
        }

        let output = Command::new(BUILD_JS_SCRIPT).output().unwrap_or_else(|_| {
            error!("Failed to build the react source");
            std::process::exit(1);
        });

        if !output.status.success() {
            error!("Failed to build the react source");
            error!("Error: {}", String::from_utf8_lossy(&output.stderr));
            std::process::exit(1);
        }
    }

    pub fn run_rust_server(&self) -> Child {
        Command::new("cargo")
            .arg("run")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("Failed to run the rust server")
    }

    pub fn build_tuono_config(&mut self) -> io::Result<std::process::Output> {
        if !Path::new(BUILD_TUONO_CONFIG).exists() {
            eprintln!("Failed to find the build script. Please run `npm install`");
            std::process::exit(1);
        }

        let config_build_command = Command::new(BUILD_TUONO_CONFIG)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output();

        match Config::get() {
            Ok(config) => self.config = Some(config),
            Err(error) => {
                match error.kind() {
                    io::ErrorKind::NotFound => eprintln!(
                        "Failed to read config. Please run `npm install` to generate automatically."
                    ),
                    _ => {
                        error!("Failed to read config with the following error:");
                        error!("{}", error);
                    }
                }
                std::process::exit(1);
            }
        }

        config_build_command
    }
    pub fn get_used_http_methods(&self) -> HashSet<Method> {
        let mut acc = HashSet::new();

        for (_, route) in self.route_map.clone().into_iter() {
            if route.axum_info.is_some() {
                acc.insert(Method::GET);
            }
            if !route.is_api() {
                continue;
            }
            for method in route.api_data.unwrap().methods.into_iter() {
                acc.insert(method);
            }
        }

        acc
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Uses unix-style paths; the collection/path logic is identical across
    // platforms (only the separator differs, which `is_api_path` normalises).
    #[cfg(not(target_os = "windows"))]
    #[test]
    fn middleware_files_are_not_collectible_routes() {
        let base_path = Path::new("/home/user/app");

        // A genuine API handler under `/api/` is a route.
        assert!(is_collectible_route(
            Path::new("/home/user/app/src/routes/api/health.rs"),
            base_path,
        ));
        // `middleware.rs` under `/api/` must NOT be collected as a route (it was
        // previously matched by `is_api_path` and leaked into the route tree).
        assert!(!is_collectible_route(
            Path::new("/home/user/app/src/routes/api/middleware.rs"),
            base_path,
        ));
        // A top-level `middleware.rs` is likewise not a route.
        assert!(!is_collectible_route(
            Path::new("/home/user/app/src/routes/middleware.rs"),
            base_path,
        ));
    }

    #[test]
    fn should_collect_routes() {
        let mut app = App::new();
        #[cfg(target_os = "windows")]
        let base_path = "\\home\\user\\Documents\\tuono";

        #[cfg(not(target_os = "windows"))]
        let base_path = "/home/user/Documents/tuono";

        app.base_path = base_path.into();

        #[cfg(target_os = "windows")]
        let routes = [
            "\\home\\user\\Documents\\tuono\\src\\routes\\about\\page.rs",
            "\\home\\user\\Documents\\tuono\\src\\routes\\page.rs",
            "\\home\\user\\Documents\\tuono\\src\\routes\\posts\\page.rs",
            "\\home\\user\\Documents\\tuono\\src\\routes\\posts\\[post]\\page.rs",
            "\\home\\user\\Documents\\tuono\\src\\routes\\posts\\handle-this\\page.rs",
            "\\home\\user\\Documents\\tuono\\src\\routes\\posts\\handle-this\\[post]\\page.rs",
            "\\home\\user\\Documents\\tuono\\src\\routes\\posts\\UPPERCASE\\page.rs",
        ];

        #[cfg(not(target_os = "windows"))]
        let routes = [
            "/home/user/Documents/tuono/src/routes/about/page.rs",
            "/home/user/Documents/tuono/src/routes/page.rs",
            "/home/user/Documents/tuono/src/routes/posts/page.rs",
            "/home/user/Documents/tuono/src/routes/posts/[post]/page.rs",
            "/home/user/Documents/tuono/src/routes/posts/handle-this/page.rs",
            "/home/user/Documents/tuono/src/routes/posts/handle-this/[post]/page.rs",
            "/home/user/Documents/tuono/src/routes/posts/UPPERCASE/page.rs",
        ];

        routes
            .into_iter()
            .for_each(|route| app.collect_route(Ok(PathBuf::from(route))));

        let results = [
            ("/page", "page"),
            ("/about/page", "about_page"),
            ("/posts/page", "posts_page"),
            ("/posts/[post]/page", "posts_dyn_post_page"),
            ("/posts/handle-this/page", "posts_handle_hyphen_this_page"),
            (
                "/posts/handle-this/[post]/page",
                "posts_handle_hyphen_this_dyn_post_page",
            ),
            ("/posts/UPPERCASE/page", "posts_uppercase_page"),
        ];

        results.into_iter().for_each(|(path, module_import)| {
            assert_eq!(
                app.route_map
                    .get(path)
                    .unwrap()
                    .axum_info
                    .as_ref()
                    .unwrap()
                    .module_import,
                String::from(module_import)
            )
        })
    }

    #[test]
    fn should_create_multi_level_axum_paths() {
        let mut app = App::new();

        #[cfg(target_os = "windows")]
        let base_path = "\\home\\user\\Documents\\tuono";

        #[cfg(not(target_os = "windows"))]
        let base_path = "/home/user/Documents/tuono";

        app.base_path = base_path.into();

        #[cfg(target_os = "windows")]
        let routes = [
            "\\home\\user\\Documents\\tuono\\src\\routes\\about\\page.rs",
            "\\home\\user\\Documents\\tuono\\src\\routes\\page.rs",
            "\\home\\user\\Documents\\tuono\\src\\routes\\posts\\page.rs",
            "\\home\\user\\Documents\\tuono\\src\\routes\\posts\\any-post\\page.rs",
            "\\home\\user\\Documents\\tuono\\src\\routes\\posts\\[post]\\page.rs",
        ];

        #[cfg(not(target_os = "windows"))]
        let routes = [
            "/home/user/Documents/tuono/src/routes/about/page.rs",
            "/home/user/Documents/tuono/src/routes/page.rs",
            "/home/user/Documents/tuono/src/routes/posts/page.rs",
            "/home/user/Documents/tuono/src/routes/posts/any-post/page.rs",
            "/home/user/Documents/tuono/src/routes/posts/[post]/page.rs",
        ];

        routes
            .into_iter()
            .for_each(|route| app.collect_route(Ok(PathBuf::from(route))));

        let results = [
            ("/page", "/"),
            ("/about/page", "/about"),
            ("/posts/page", "/posts"),
            ("/posts/any-post/page", "/posts/any-post"),
            ("/posts/[post]/page", "/posts/{post}"),
        ];

        results.into_iter().for_each(|(path, expected_path)| {
            assert_eq!(
                app.route_map
                    .get(path)
                    .expect("Failed to get route path")
                    .axum_info
                    .as_ref()
                    .unwrap()
                    .axum_route,
                String::from(expected_path)
            )
        })
    }

    #[test]
    fn should_ignore_whitelisted_extensions() {
        let mut app = App::new();
        app.base_path = "/home/user/Documents/tuono".into();

        let routes = [
            "/home/user/Documents/tuono/src/routes/about.css",
            "/home/user/Documents/tuono/src/routes/index.scss",
            "/home/user/Documents/tuono/src/routes/posts/index.sass",
        ];

        routes.into_iter().for_each(|route| {
            if app.should_collect_route(&Ok(PathBuf::from(route))) {
                app.collect_route(Ok(PathBuf::from(route)))
            }
        });

        assert!(app.route_map.is_empty())
    }

    #[test]
    fn should_ignore_special_and_stray_files() {
        let mut app = App::new();
        app.base_path = "/home/user/Documents/tuono".into();

        let routes = [
            "/home/user/Documents/tuono/src/routes/layout.tsx",
            "/home/user/Documents/tuono/src/routes/posts/layout.tsx",
            "/home/user/Documents/tuono/src/routes/loading.tsx",
            "/home/user/Documents/tuono/src/routes/error.tsx",
            "/home/user/Documents/tuono/src/routes/not-found.tsx",
            "/home/user/Documents/tuono/src/routes/posts/loading.tsx",
            // A stray colocated component is not a route.
            "/home/user/Documents/tuono/src/routes/posts/helper.tsx",
        ];

        routes.into_iter().for_each(|route| {
            if app.should_collect_route(&Ok(PathBuf::from(route))) {
                app.collect_route(Ok(PathBuf::from(route)))
            }
        });

        assert!(app.route_map.is_empty())
    }

    #[test]
    fn should_collect_only_page_and_api_files() {
        let mut app = App::new();
        app.base_path = "/home/user/Documents/tuono".into();

        // Page files are collected; stray/special files are not. (API handlers
        // are also collected — via `is_api_route` — but reading their `#[api]`
        // methods requires a real file, so that path is covered by e2e tests.)
        let page = "/home/user/Documents/tuono/src/routes/about/page.rs";
        let layout_handler = "/home/user/Documents/tuono/src/routes/about/layout.rs";
        let stray = "/home/user/Documents/tuono/src/routes/about/helper.tsx";
        let layout_component = "/home/user/Documents/tuono/src/routes/about/layout.tsx";

        assert!(app.should_collect_route(&Ok(PathBuf::from(page))));
        // `layout.rs` is a data handler and IS collected; `layout.tsx` is not.
        assert!(app.should_collect_route(&Ok(PathBuf::from(layout_handler))));
        assert!(!app.should_collect_route(&Ok(PathBuf::from(layout_component))));
        assert!(!app.should_collect_route(&Ok(PathBuf::from(stray))));
        assert!(is_api_path(
            Path::new("/home/user/Documents/tuono/src/routes/api/health_check.rs"),
            &app.base_path
        ));
    }

    #[test]
    fn should_correctly_parse_routes_with_server_handler() {
        let mut app = App::new();

        #[cfg(target_os = "windows")]
        let base_path = "\\home\\user\\Documents\\tuono";

        #[cfg(not(target_os = "windows"))]
        let base_path = "/home/user/Documents/tuono";

        app.base_path = base_path.into();

        #[cfg(target_os = "windows")]
        let routes = [
            "\\home\\user\\Documents\\tuono\\src\\routes\\about\\page.rs",
            "\\home\\user\\Documents/tuono\\src\\routes\\about\\page.tsx",
            "\\home\\user\\Documents\\tuono\\src\\routes\\page.tsx",
        ];

        #[cfg(not(target_os = "windows"))]
        let routes = [
            "/home/user/Documents/tuono/src/routes/about/page.rs",
            "/home/user/Documents/tuono/src/routes/about/page.tsx",
            "/home/user/Documents/tuono/src/routes/page.tsx",
        ];

        routes
            .into_iter()
            .for_each(|route| app.collect_route(Ok(PathBuf::from(route))));

        let results = [("/about/page", true), ("/page", false)];

        results
            .into_iter()
            .for_each(|(path, expected_has_server_handler)| {
                if expected_has_server_handler {
                    assert!(
                        app.route_map
                            .get(path)
                            .expect("Failed to get route path")
                            .axum_info
                            .is_some()
                    )
                } else {
                    assert!(
                        app.route_map
                            .get(path)
                            .expect("Failed to get route path")
                            .axum_info
                            .is_none()
                    )
                }
            })
    }

    #[test]
    fn has_dynamic_routes_works() {
        let mut app = App::new();
        app.base_path = "/home/user/Documents/tuono".into();

        let routes = [
            "/home/user/Documents/tuono/src/routes/page.rs",
            "/home/user/Documents/tuono/src/routes/posts/[post]/page.rs",
        ];

        routes
            .into_iter()
            .for_each(|route| app.collect_route(Ok(PathBuf::from(route))));

        assert!(app.has_dynamic_routes());

        let mut app2 = App::new();
        app2.base_path = "/home/user/Documents/tuono".into();

        let routes = [
            "/home/user/Documents/tuono/src/routes/[post]/page.rs",
            "/home/user/Documents/tuono/src/routes/posts/[post]/page.rs",
        ];

        routes
            .into_iter()
            .for_each(|route| app2.collect_route(Ok(PathBuf::from(route))));

        assert!(app2.has_dynamic_routes());

        let mut app3 = App::new();
        app3.base_path = "/home/user/Documents/tuono".into();

        let routes = [
            "/home/user/Documents/tuono/src/routes/page.rs",
            "/home/user/Documents/tuono/src/routes/posts/page.rs",
        ];

        routes
            .into_iter()
            .for_each(|route| app3.collect_route(Ok(PathBuf::from(route))));

        assert!(!app3.has_dynamic_routes())
    }
}
