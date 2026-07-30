use std::io::prelude::*;
use std::path::{Path, PathBuf};
use std::{fs, io};

use clap::crate_version;
use tracing::error;

use crate::app::{App, ROUTES_FOLDER_PATH};
use crate::mode::Mode;
use crate::route::AxumInfo;
use crate::route_directory_info::{MIDDLEWARE_FILENAME, RouteDirectoryInfo};
use crate::typescript::{TypesJar, collect_layout_props, collect_route_props, render_route_props};

#[cfg(not(target_os = "windows"))]
const FALLBACK_HTML: &str = include_str!("../templates/fallback.html");
#[cfg(not(target_os = "windows"))]
const SERVER_ENTRY_DATA: &str = include_str!("../templates/server.ts");
#[cfg(not(target_os = "windows"))]
const CLIENT_ENTRY_DATA: &str = include_str!("../templates/client.ts");
#[cfg(not(target_os = "windows"))]
const AXUM_ENTRY_POINT: &str = include_str!("../templates/server.rs");

#[cfg(not(target_os = "windows"))]
const MAIN_FILE_PATH: &str = "./.tuono/main.rs";

#[cfg(not(target_os = "windows"))]
const FALLBACK_HTML_PATH: &str = "./.tuono/index.html";

const ROUTE_FOLDER: &str = "src/routes";
const DEV_FOLDER: &str = ".tuono";

#[cfg(target_os = "windows")]
const FALLBACK_HTML: &str = include_str!("..\\templates\\fallback.html");
#[cfg(target_os = "windows")]
const SERVER_ENTRY_DATA: &str = include_str!("..\\templates\\server.ts");
#[cfg(target_os = "windows")]
const CLIENT_ENTRY_DATA: &str = include_str!("..\\templates\\client.ts");
#[cfg(target_os = "windows")]
const AXUM_ENTRY_POINT: &str = include_str!("..\\templates\\server.rs");

#[cfg(target_os = "windows")]
const MAIN_FILE_PATH: &str = ".\\.tuono\\main.rs";

#[cfg(target_os = "windows")]
const FALLBACK_HTML_PATH: &str = ".\\.tuono\\index.html";

// Use this function to instruct the users on how to
// fix their setup to make tuono work
fn recoverable_error(message: &str) -> ! {
    error!("{}", message);
    std::process::exit(1);
}

// Header kept on the generated `main.rs`. `prettyplease` (like `syn`) drops
// non-doc `//` comments, so it is re-applied after formatting.
const GENERATED_FILE_HEADER: &str =
    "// File automatically generated\n// Do not manually change it\n";

// Format generated Rust source so the emitted `.tuono/main.rs` is readable
// instead of a single concatenated line. Falls back to the raw source if it
// cannot be parsed, so a malformed generation still surfaces a real compiler
// error rather than being swallowed here.
fn format_rust_source(source: &str) -> String {
    match syn::parse_file(source) {
        Ok(parsed) => format!(
            "{GENERATED_FILE_HEADER}\n{}",
            prettyplease::unparse(&parsed)
        ),
        Err(_) => source.to_string(),
    }
}

// Struct to build the source code
// on both "dev" and "build" commands
#[derive(Clone, Debug)]
pub struct SourceBuilder {
    pub app: App,
    mode: Mode,
    base_path: PathBuf,
    types_jar: TypesJar,
}

impl SourceBuilder {
    pub fn new(mode: Mode) -> io::Result<Self> {
        if !PathBuf::from("tuono.config.ts").exists() {
            recoverable_error("Cannot find tuono.config.ts - is this a tuono project?");
        }

        let dev_folder = Path::new(DEV_FOLDER);
        if !&dev_folder.is_dir() {
            fs::create_dir(dev_folder)?;
        }

        let app = App::new();

        let base_path = std::env::current_dir()?;

        Ok(Self {
            app,
            mode,
            types_jar: TypesJar::from(&base_path),
            base_path,
        })
    }

    // Build the source code needed for both build and dev
    pub fn base_build(&mut self) -> io::Result<()> {
        let mode = self.mode.clone();

        self.refresh_axum_source()?;
        let dev_folder = Path::new(DEV_FOLDER);
        self.create_file(dev_folder.join("server-main.tsx"), SERVER_ENTRY_DATA)?;
        self.create_file(dev_folder.join("client-main.tsx"), CLIENT_ENTRY_DATA)?;

        self.types_jar
            .generate_typescript_file(&self.base_path, &self.route_props_typescript())?;

        if mode == Mode::Dev {
            self.app.build_tuono_config()?;
            let fallback_html = self.build_html_fallback();
            self.create_file(PathBuf::from(FALLBACK_HTML_PATH), &fallback_html)?;
        }

        Ok(())
    }

    fn generate_axum_source(&self) -> String {
        let Self { app, mode, .. } = &self;
        let mut main_file_definition: &str = " let router = Router::new()";
        let mut main_file_usage: &str = ";";
        // `ApplicationState` is always referenced by the handlers' data entry
        // point (`tuono_internal_props`) and by the layout composites, so it is
        // aliased to the unit state unless the app defines a custom one below.
        let mut mainfile_import: &str =
            "mod tuono_main_state { pub type ApplicationState = (); }\n";
        let mode_str = mode.as_str();
        if app.has_app_state {
            main_file_definition = "let user_custom_state = tuono_main_state::main().await;\n
            let router = Router::new()";
            main_file_usage = ".with_state(user_custom_state);";
            mainfile_import = r#"#[path="../src/app.rs"]
            mod tuono_main_state;
            "#;
        }
        let src = AXUM_ENTRY_POINT
            .replace("\r", "")
            .replace(
                "// ROUTE_BUILDER\n",
                &self.create_routes_declaration(&app.route_directory_info),
            )
            .replace(
                "// MODULE_IMPORTS\n",
                &format!(
                    "{}{}",
                    self.create_modules_declaration(&app.route_directory_info),
                    self.create_composite_handlers(),
                ),
            )
            .replace("/*VERSION*/", crate_version!())
            .replace(
                "/*MODE*/",
                format!("const MODE: Mode = {mode_str};").as_ref(),
            )
            .replace("//MAIN_FILE_IMPORT//", mainfile_import)
            .replace("//MAIN_FILE_DEFINITION//", main_file_definition)
            .replace("//MAIN_FILE_USAGE//", main_file_usage);

        let mut import_http_handler = String::new();

        let used_http_methods = app.get_used_http_methods();

        for method in used_http_methods.into_iter() {
            let method = method.to_string().to_lowercase();
            import_http_handler.push_str(&format!("use tuono_lib::axum::routing::{method};\n"))
        }

        src.replace("// AXUM_GET_ROUTE_HANDLER", &import_http_handler)
    }

    pub fn refresh_axum_source(&self) -> io::Result<()> {
        let axum_source = self.generate_axum_source();

        self.create_file(
            PathBuf::from(MAIN_FILE_PATH),
            &format_rust_source(&axum_source),
        )?;

        Ok(())
    }

    fn create_file(&self, path: PathBuf, content: &str) -> io::Result<()> {
        let mut data_file = fs::File::create(self.base_path.join(path))?;

        data_file.write_all(content.as_bytes())?;

        Ok(())
    }

    pub fn refresh_typescript_file(&mut self, path: PathBuf) {
        self.types_jar.refresh_file(path);
    }

    pub fn remove_typescript_file(&mut self, path: PathBuf) {
        self.types_jar.remove_file(path);
    }

    pub fn generate_typescript_file(&mut self) -> io::Result<()> {
        let extra = self.route_props_typescript();
        self.types_jar
            .generate_typescript_file(&self.base_path, &extra)
    }

    /// The `RouteProps` map + `TuonoPage` helper, derived from each page
    /// handler's return type. Recomputed on each generation so it tracks route
    /// and handler changes.
    fn route_props_typescript(&self) -> String {
        render_route_props(
            &collect_route_props(&self.base_path),
            &collect_layout_props(&self.base_path),
        )
    }

    // Adds calls to .layer() for adding middleware to axum
    pub fn add_route_layers(&self, route_directory_info: &RouteDirectoryInfo) -> String {
        let mut layers_str = String::from("");

        if route_directory_info.has_middlewares() {
            let middleware_import = &route_directory_info.get_middleware_module_import();
            let layers = &route_directory_info.middlewares.lock().unwrap();
            for layer in layers.iter() {
                let middleware_fn_call = layer.fn_call_str.clone();
                layers_str.push_str(&format!(
                    r#".layer({middleware_import}::{middleware_fn_call})
                            "#
                ));
            }
        }
        layers_str
    }

    // Adds Routers with routes to axum
    fn create_routes_declaration(&self, route_directory_info: &RouteDirectoryInfo) -> String {
        let routes = route_directory_info.routes.clone();
        let mut route_declarations = String::from("// ROUTE_BUILDER\n");

        route_declarations.push_str(r#".merge(Router::new()"#);
        // Group by directory, find dirs with middleware, have that spit out Router::new() with routes and middlewares

        // directories can have their own middlewares and routes, recurse into that directory to get route/middleware info
        for directory in route_directory_info.directories.clone() {
            route_declarations.push_str(&self.create_routes_declaration(&directory));
        }
        for (key, route) in routes {
            let Some(axum_info) = &route.axum_info else {
                continue;
            };
            // A `layout.rs` has no standalone route — it is composed into every
            // page it wraps (see `create_composite_handlers`).
            if route.is_layout {
                continue;
            }
            let AxumInfo {
                axum_route,
                module_import,
            } = axum_info;
            if route.is_api() {
                for method in route.api_data.as_ref().unwrap().methods.clone() {
                    let method = method.to_string().to_lowercase();
                    route_declarations.push_str(&format!(
                            r#".route("{axum_route}", {method}({module_import}::{method}_tuono_internal_api))"#
                    ));
                }
            } else if self.layout_modules_for_page(&key).is_empty() {
                // Plain page: render + data handlers straight from its module.
                route_declarations.push_str(&format!(
                    r#".route("{axum_route}", get({module_import}::tuono_internal_route))"#
                ));
                route_declarations.push_str(&format!(
                    r#".route("/__tuono/data{axum_route}", get({module_import}::tuono_internal_api))"#
                ));
            } else {
                // Wrapped by ≥1 `layout.rs`: use the generated composites.
                route_declarations.push_str(&format!(
                    r#".route("{axum_route}", get(__tuono_ssr_{module_import}))"#
                ));
                route_declarations.push_str(&format!(
                    r#".route("/__tuono/data{axum_route}", get(__tuono_data_{module_import}))"#
                ));
            }
        }

        route_declarations.push_str(")\n");

        // add directory level middleware to routes
        if route_directory_info.has_middlewares() {
            route_declarations.push_str(&self.add_route_layers(route_directory_info));
        }
        route_declarations
    }

    fn create_modules_declaration(&self, route_directory_info: &RouteDirectoryInfo) -> String {
        let routes = &route_directory_info.routes;
        let mut module_declarations = String::from("// MODULE_IMPORTS\n");

        // add subdirectory module declarations
        for directory in route_directory_info.directories.clone() {
            module_declarations.push_str(&self.create_modules_declaration(&directory));
        }

        // add module import per route
        for (path, route) in routes.iter() {
            if let Some(route_auxm_info) = &route.axum_info {
                let AxumInfo { module_import, .. } = route_auxm_info;

                module_declarations.push_str(&format!(
                    r#"#[path="../{ROUTE_FOLDER}{path}.rs"]
                    mod {module_import};
                    "#
                ));
            }
        }
        // add middleware module import as needed
        if route_directory_info.has_middlewares() {
            let path = &route_directory_info.path;
            let base_path = RouteDirectoryInfo::get_base_path();
            let base_path_str = base_path.to_string_lossy();
            let routes_path_str = format!("{base_path_str}{ROUTES_FOLDER_PATH}");

            let replaced_path = path.replace(&routes_path_str, "");
            let module_path: String = format!("{replaced_path}/{MIDDLEWARE_FILENAME}");
            let module_import = route_directory_info.get_middleware_module_import();

            module_declarations.push_str(&format!(
                r#"#[path="../{ROUTE_FOLDER}{module_path}.rs"]
            mod {module_import};
            "#
            ));
        }

        module_declarations
    }

    /// The `layout.rs` handlers wrapping a page, ordered outermost → innermost,
    /// as `(dataKey, module)` pairs. `dataKey` is the layout's route file path
    /// (matching the client route's `dataKey`); `module` is its `#[path] mod`
    /// name. Walks the page's ancestor directories (groups included) looking for
    /// a collected `layout` route.
    fn layout_modules_for_page(&self, page_path: &str) -> Vec<(String, String)> {
        let directory = page_path.strip_suffix("/page").unwrap_or(page_path);

        // Ancestor directories, root first: "" (root), "/a", "/a/b", …
        let mut prefixes = vec![String::new()];
        let mut accumulator = String::new();
        for segment in directory.split('/').filter(|segment| !segment.is_empty()) {
            accumulator.push('/');
            accumulator.push_str(segment);
            prefixes.push(accumulator.clone());
        }

        prefixes
            .into_iter()
            .filter_map(|prefix| {
                let layout_path = format!("{prefix}/layout");
                let route = self.app.route_map.get(&layout_path)?;
                let module = route.axum_info.as_ref()?.module_import.clone();
                route.is_layout.then_some((layout_path, module))
            })
            .collect()
    }

    /// Free functions that compose a page with the `layout.rs` handlers wrapping
    /// it: one SSR handler and one data-endpoint handler per page that has at
    /// least one wrapping layout with a data handler. Both extract the app state
    /// once and hand a clone to every handler in the chain.
    fn create_composite_handlers(&self) -> String {
        let mut handlers = String::new();

        for (page_path, route) in &self.app.route_map {
            if route.is_layout || route.is_api() {
                continue;
            }
            let Some(page_info) = &route.axum_info else {
                continue;
            };
            let layouts = self.layout_modules_for_page(page_path);
            if layouts.is_empty() {
                continue;
            }

            let page_module = &page_info.module_import;

            // The page + every wrapping layout fetch their data concurrently via
            // `tokio::join!`: the composite polls all `tuono_internal_props`
            // futures on the one request task so their awaits overlap (latency is
            // ~max, not the sum). `join!` needs a statically-known arity, which we
            // have here because the chain length is fixed at codegen time. The
            // page is the first future so it destructures to `page`; each layout
            // binds to `layout_{i}` in chain order. `render_chain`/`chain_json`
            // still short-circuit on the first redirect/error in chain order, so
            // resolving eagerly does not change observable behaviour.
            let join_futures = std::iter::once(format!(
                "{page_module}::tuono_internal_props(req.clone(), state.clone())"
            ))
            .chain(layouts.iter().map(|(_, module)| {
                format!("{module}::tuono_internal_props(req.clone(), state.clone())")
            }))
            .collect::<Vec<_>>()
            .join(",\n                        ");

            let bindings = std::iter::once("page".to_string())
                .chain((0..layouts.len()).map(|i| format!("layout_{i}")))
                .collect::<Vec<_>>()
                .join(", ");

            let layout_entries = layouts
                .iter()
                .enumerate()
                .map(|(i, (data_key, _))| format!(r#"("{data_key}".to_string(), layout_{i})"#))
                .collect::<Vec<_>>()
                .join(", ");

            handlers.push_str(&format!(
                r#"
                async fn __tuono_ssr_{page_module}(
                    tuono_lib::axum::extract::Path(params): tuono_lib::axum::extract::Path<std::collections::HashMap<String, String>>,
                    tuono_lib::axum::extract::State(state): tuono_lib::axum::extract::State<crate::tuono_main_state::ApplicationState>,
                    request: tuono_lib::axum::extract::Request,
                ) -> impl tuono_lib::axum::response::IntoResponse {{
                    let req = tuono_lib::Request::new(request.uri().to_owned(), request.headers().to_owned(), params, None);
                    let ({bindings}) = tuono_lib::tokio::join!(
                        {join_futures}
                    );
                    let layouts = vec![{layout_entries}];
                    tuono_lib::render_chain(req, page, layouts)
                }}

                async fn __tuono_data_{page_module}(
                    tuono_lib::axum::extract::Path(params): tuono_lib::axum::extract::Path<std::collections::HashMap<String, String>>,
                    tuono_lib::axum::extract::State(state): tuono_lib::axum::extract::State<crate::tuono_main_state::ApplicationState>,
                    request: tuono_lib::axum::extract::Request,
                ) -> impl tuono_lib::axum::response::IntoResponse {{
                    let req = tuono_lib::Request::new(request.uri().to_owned(), request.headers().to_owned(), params, None);
                    let ({bindings}) = tuono_lib::tokio::join!(
                        {join_futures}
                    );
                    let layouts = vec![{layout_entries}];
                    tuono_lib::chain_json(page, layouts)
                }}
                "#
            ));
        }

        handlers
    }

    fn build_html_fallback(&self) -> String {
        if let Some(config) = &self.app.config.as_ref() {
            if let Some(origin) = &config.server.origin {
                FALLBACK_HTML.replace("[BASE_URL]", origin)
            } else {
                let url = format!("http://{}:{}", config.server.host, config.server.port);
                FALLBACK_HTML.replace("[BASE_URL]", url.as_str())
            }
        } else {
            "".to_string()
        }
    }
}

#[cfg(test)]
mod tests {

    use super::*;
    use crate::route::Route;

    #[test]
    fn should_set_the_correct_mode() {
        let dev_bundle = SourceBuilder {
            app: App::new(),
            mode: Mode::Dev,
            base_path: PathBuf::new(),
            types_jar: TypesJar::default(),
        }
        .generate_axum_source();

        let prod_bundle = SourceBuilder {
            app: App::new(),
            mode: Mode::Prod,
            base_path: PathBuf::new(),
            types_jar: TypesJar::default(),
        }
        .generate_axum_source();

        assert!(dev_bundle.contains("const MODE: Mode = Mode::Dev;"));
        assert!(prod_bundle.contains("const MODE: Mode = Mode::Prod;"));
    }

    #[test]
    fn should_not_load_the_axum_get_function() {
        let dev_bundle = SourceBuilder {
            app: App::new(),
            mode: Mode::Dev,
            base_path: PathBuf::new(),
            types_jar: TypesJar::default(),
        }
        .generate_axum_source();

        assert!(!dev_bundle.contains("use tuono_lib::axum::routing::get;"));
    }

    #[test]
    fn should_load_the_axum_get_function() {
        let mut source_builder = SourceBuilder {
            app: App::new(),
            mode: Mode::Dev,
            base_path: PathBuf::new(),
            types_jar: TypesJar::default(),
        };

        let mut route = Route::new(String::from("index.tsx"));
        route.update_axum_info();

        source_builder
            .app
            .route_map
            .insert(String::from("index.rs"), route);

        let dev_bundle = source_builder.generate_axum_source();

        assert!(dev_bundle.contains("use tuono_lib::axum::routing::get;"));
    }

    #[test]
    fn should_create_fallback_html_with_default_config() {
        let mut app = App::new();
        app.config = Some(Default::default());

        let source_builder = SourceBuilder {
            app,
            mode: Mode::Dev,
            base_path: PathBuf::new(),
            types_jar: TypesJar::default(),
        };

        let fallback_html = source_builder.build_html_fallback();

        assert!(fallback_html.contains("http://localhost:3000/vite-server/@react-refresh"));
        assert!(fallback_html.contains("http://localhost:3000/vite-server/@vite/client"));
        assert!(fallback_html.contains("http://localhost:3000/vite-server/client-main.tsx"));
    }
}
