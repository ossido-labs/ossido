use std::io::prelude::*;
use std::path::{Path, PathBuf};
use std::{fs, io};

use clap::crate_version;
use tracing::error;

use crate::app::{App, MIDDLEWARE_FILENAME, ROUTES_FOLDER_PATH};
use crate::mode::Mode;
use crate::route::AxumInfo;
use crate::route_directory_info::RouteDirectoryInfo;
use crate::typescript::{
    ActionDef, TypesJar, collect_actions, collect_api_routes, collect_layout_props,
    collect_route_props, render_actions_client, render_api_routes, render_route_props,
};

#[cfg(not(target_os = "windows"))]
const FALLBACK_HTML: &str = include_str!("../templates/fallback.html");
#[cfg(not(target_os = "windows"))]
const SERVER_ENTRY_DATA: &str = include_str!("../templates/server.ts");
#[cfg(not(target_os = "windows"))]
const CLIENT_ENTRY_DATA: &str = include_str!("../templates/client.ts");
#[cfg(not(target_os = "windows"))]
const AXUM_ENTRY_POINT: &str = include_str!("../templates/server.rs");
#[cfg(not(target_os = "windows"))]
const TSCONFIG_DATA: &str = include_str!("../templates/tsconfig.json");

#[cfg(not(target_os = "windows"))]
const MAIN_FILE_PATH: &str = "./.ossido/main.rs";

#[cfg(not(target_os = "windows"))]
const FALLBACK_HTML_PATH: &str = "./.ossido/index.html";

const ROUTE_FOLDER: &str = "src/routes";
const DEV_FOLDER: &str = ".ossido";

#[cfg(target_os = "windows")]
const FALLBACK_HTML: &str = include_str!("..\\templates\\fallback.html");
#[cfg(target_os = "windows")]
const SERVER_ENTRY_DATA: &str = include_str!("..\\templates\\server.ts");
#[cfg(target_os = "windows")]
const CLIENT_ENTRY_DATA: &str = include_str!("..\\templates\\client.ts");
#[cfg(target_os = "windows")]
const AXUM_ENTRY_POINT: &str = include_str!("..\\templates\\server.rs");
#[cfg(target_os = "windows")]
const TSCONFIG_DATA: &str = include_str!("..\\templates\\tsconfig.json");

#[cfg(target_os = "windows")]
const MAIN_FILE_PATH: &str = ".\\.ossido\\main.rs";

#[cfg(target_os = "windows")]
const FALLBACK_HTML_PATH: &str = ".\\.ossido\\index.html";

// Use this function to instruct the users on how to
// fix their setup to make ossido work
fn recoverable_error(message: &str) -> ! {
    error!("{}", message);
    std::process::exit(1);
}

// Header kept on the generated `main.rs`. `prettyplease` (like `syn`) drops
// non-doc `//` comments, so it is re-applied after formatting.
const GENERATED_FILE_HEADER: &str =
    "// File automatically generated\n// Do not manually change it\n";

// Format generated Rust source so the emitted `.ossido/main.rs` is readable
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
        if !PathBuf::from("ossido.config.ts").exists() {
            recoverable_error("Cannot find ossido.config.ts - is this a ossido project?");
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

    // Build the source code needed for both build and dev. Typescript types are
    // NOT generated here — callers run `generate_typescript_file` as a separate
    // step so the CLI can report it as its own checklist item.
    pub fn base_build(&mut self) -> io::Result<()> {
        let mode = self.mode.clone();

        self.refresh_axum_source()?;
        let dev_folder = Path::new(DEV_FOLDER);
        self.create_file(dev_folder.join("server-main.tsx"), SERVER_ENTRY_DATA)?;
        self.create_file(dev_folder.join("client-main.tsx"), CLIENT_ENTRY_DATA)?;
        // A local tsconfig so the generated `.ossido` sources (which import from
        // `../src`) type-check in editors — it inherits the project's compiler
        // options and scopes to the generated entry files.
        self.create_file(dev_folder.join("tsconfig.json"), TSCONFIG_DATA)?;

        if mode == Mode::Dev {
            self.app.build_ossido_config()?;
            let fallback_html = self.build_html_fallback();
            self.create_file(PathBuf::from(FALLBACK_HTML_PATH), &fallback_html)?;
        }

        Ok(())
    }

    fn generate_axum_source(&self) -> String {
        let Self { app, mode, .. } = &self;
        // Server actions live in `actions.rs` / `*.actions.rs` files under
        // `src/routes` — discovered here so they can be module-declared, routed,
        // and (below) pull in the `post` import.
        let actions = collect_actions(&self.base_path);
        let mut main_file_definition: String = " let router = Router::new()".to_string();
        let mut main_file_usage: &str = ";";
        // `ApplicationState` is referenced by the handlers' data entry point
        // (`ossido_internal_props`) and by the layout composites, so it is aliased
        // to the unit state unless the app defines a custom one below. The
        // `allow(dead_code)` covers apps with no Rust handlers at all, where the
        // alias ends up unreferenced.
        let mut mainfile_import: &str =
            "mod ossido_main_state { #[allow(dead_code)] pub type ApplicationState = (); }\n";
        let mode_str = mode.as_str();
        if app.has_app_state {
            // Only `.await` the state initialiser when `app.rs`'s `main` is async.
            let await_suffix = if app.app_state_is_async { ".await" } else { "" };
            main_file_definition = format!(
                "let user_custom_state = ossido_main_state::main(){await_suffix};\n\
                 let router = Router::new()"
            );
            main_file_usage = ".with_state(user_custom_state);";
            mainfile_import = r#"#[path="../src/app.rs"]
            mod ossido_main_state;
            "#;
        }
        let src = AXUM_ENTRY_POINT
            .replace("\r", "")
            .replace(
                "// ROUTE_BUILDER\n",
                &format!(
                    "{}{}",
                    self.create_routes_declaration(&app.route_directory_info),
                    self.create_actions_routes(&actions),
                ),
            )
            .replace(
                "// MODULE_IMPORTS\n",
                &format!(
                    "{}{}{}",
                    self.create_modules_declaration(&app.route_directory_info),
                    self.create_composite_handlers(),
                    self.create_actions_modules(&actions),
                ),
            )
            .replace("/*VERSION*/", crate_version!())
            .replace(
                "/*MODE*/",
                format!("const MODE: Mode = {mode_str};").as_ref(),
            )
            .replace("//MAIN_FILE_IMPORT//", mainfile_import)
            .replace("//MAIN_FILE_DEFINITION//", &main_file_definition)
            .replace("//MAIN_FILE_USAGE//", main_file_usage);

        let mut import_http_handler = String::new();

        let used_http_methods = app.get_used_http_methods();

        for method in used_http_methods.into_iter() {
            let method = method.to_string().to_lowercase();
            import_http_handler.push_str(&format!("use ossido::axum::routing::{method};\n"))
        }

        // Actions are always POST; ensure the handler is imported even when no
        // `#[api(POST)]` route already pulled it in.
        if !actions.is_empty() && !import_http_handler.contains("routing::post;") {
            import_http_handler.push_str("use ossido::axum::routing::post;\n");
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
        let api_routes = render_api_routes(&collect_api_routes(&self.base_path));

        // The importable, typed server-action functions (`.ossido/actions.ts`)
        // — a real module (not just an ambient declaration) so user code can
        // `import { createUser } from ".ossido/actions"`.
        let actions_client = render_actions_client(&collect_actions(&self.base_path));
        self.create_file(
            PathBuf::from(DEV_FOLDER).join("actions.ts"),
            &actions_client,
        )?;

        self.types_jar
            .generate_typescript_file(&self.base_path, &extra, &api_routes)
    }

    /// The `RouteProps` map + `OssidoPage` helper, derived from each page
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
                            r#".route("{axum_route}", {method}({module_import}::{method}_ossido_internal_api))"#
                    ));
                }
            } else if self.layout_modules_for_page(&key).is_empty() {
                // Plain page: render + data handlers straight from its module.
                route_declarations.push_str(&format!(
                    r#".route("{axum_route}", get({module_import}::ossido_internal_route))"#
                ));
                route_declarations.push_str(&format!(
                    r#".route("/__ossido/data{axum_route}", get({module_import}::ossido_internal_api))"#
                ));
            } else {
                // Wrapped by ≥1 `layout.rs`: use the generated composites.
                route_declarations.push_str(&format!(
                    r#".route("{axum_route}", get(__ossido_ssr_{module_import}))"#
                ));
                route_declarations.push_str(&format!(
                    r#".route("/__ossido/data{axum_route}", get(__ossido_data_{module_import}))"#
                ));
            }

            // A dynamic route can expose its `#[static_paths]` enumerator on a
            // fixed internal endpoint keyed by the (safe, unique) module name, so
            // `ossido build --static` can fetch the pages to generate. Keyed by
            // module rather than the pattern because the pattern holds `{param}`
            // placeholders, which an enumeration endpoint must not.
            if route.has_static_paths {
                route_declarations.push_str(&format!(
                    r#".route("/__ossido/static_paths/{module_import}", get({module_import}::ossido_internal_static_paths))"#
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

    /// `#[path] mod` declarations for each distinct actions file. Actions files
    /// are not page/api/layout route modules, so they are declared separately
    /// here (one `mod` per file, even when it holds several actions).
    fn create_actions_modules(&self, actions: &[ActionDef]) -> String {
        let mut seen: std::collections::HashSet<&str> = std::collections::HashSet::new();
        let mut out = String::new();
        for action in actions {
            if seen.insert(action.module_import.as_str()) {
                out.push_str(&format!(
                    "#[path=\"../{ROUTE_FOLDER}/{rel_path}.rs\"]\nmod {module};\n",
                    rel_path = action.rel_path,
                    module = action.module_import,
                ));
            }
        }
        out
    }

    /// A `Router` merge registering every action at
    /// `POST /__ossido/action/<module>/<fn>`. Actions are always POST.
    fn create_actions_routes(&self, actions: &[ActionDef]) -> String {
        if actions.is_empty() {
            return String::new();
        }
        let mut out = String::from(".merge(Router::new()");
        for action in actions {
            out.push_str(&format!(
                r#".route("{url}", post({module}::{fn_name}_ossido_internal_action))"#,
                url = action.url,
                module = action.module_import,
                fn_name = action.fn_name,
            ));
        }
        out.push_str(")\n");
        out
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
            // Normalise separators to `/` on both sides: the middleware dir path
            // uses the platform separator (`\` on Windows), but `#[path]` values
            // and module names must use `/`.
            let routes_path_str = format!("{base_path_str}{ROUTES_FOLDER_PATH}").replace('\\', "/");

            let replaced_path = path.replace('\\', "/").replace(&routes_path_str, "");
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
            // `tokio::join!`: the composite polls all `ossido_internal_props`
            // futures on the one request task so their awaits overlap (latency is
            // ~max, not the sum). `join!` needs a statically-known arity, which we
            // have here because the chain length is fixed at codegen time. The
            // page is the first future so it destructures to `page`; each layout
            // binds to `layout_{i}` in chain order. `render_chain`/`chain_json`
            // still short-circuit on the first redirect/error in chain order, so
            // resolving eagerly does not change observable behaviour.
            let join_futures = std::iter::once(format!(
                "{page_module}::ossido_internal_props(req.clone(), state.clone())"
            ))
            .chain(layouts.iter().map(|(_, module)| {
                format!("{module}::ossido_internal_props(req.clone(), state.clone())")
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
                async fn __ossido_ssr_{page_module}(
                    ossido::axum::extract::Path(params): ossido::axum::extract::Path<std::collections::HashMap<String, String>>,
                    ossido::axum::extract::State(state): ossido::axum::extract::State<crate::ossido_main_state::ApplicationState>,
                    request: ossido::axum::extract::Request,
                ) -> impl ossido::axum::response::IntoResponse {{
                    let req = ossido::Request::new(request.uri().to_owned(), request.headers().to_owned(), params, None);
                    let ({bindings}) = ossido::tokio::join!(
                        {join_futures}
                    );
                    let layouts = vec![{layout_entries}];
                    ossido::render_chain(req, page, layouts).await
                }}

                async fn __ossido_data_{page_module}(
                    ossido::axum::extract::Path(params): ossido::axum::extract::Path<std::collections::HashMap<String, String>>,
                    ossido::axum::extract::State(state): ossido::axum::extract::State<crate::ossido_main_state::ApplicationState>,
                    request: ossido::axum::extract::Request,
                ) -> impl ossido::axum::response::IntoResponse {{
                    let req = ossido::Request::new(request.uri().to_owned(), request.headers().to_owned(), params, None);
                    let ({bindings}) = ossido::tokio::join!(
                        {join_futures}
                    );
                    let layouts = vec![{layout_entries}];
                    ossido::chain_json(page, layouts)
                }}
                "#
            ));
        }

        handlers
    }

    fn build_html_fallback(&self) -> String {
        if let Some(config) = &self.app.config.as_ref() {
            // The vite assets are proxied through this same server, so use a
            // relative base — it resolves against whatever address the browser
            // reached the dev server on (localhost, a LAN IP, …), which is what
            // lets `host: '0.0.0.0'` work; an absolute `http://0.0.0.0:port` is
            // not loadable by a browser. An explicit `origin` still wins.
            let base_url = config.server.origin.as_deref().unwrap_or("");
            FALLBACK_HTML.replace("[BASE_URL]", base_url)
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

        assert!(!dev_bundle.contains("use ossido::axum::routing::get;"));
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

        assert!(dev_bundle.contains("use ossido::axum::routing::get;"));
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

        // With no configured `origin`, vite URLs are relative (same origin as
        // the page) so `host: '0.0.0.0'` / LAN access resolve correctly.
        assert!(fallback_html.contains("'/vite-server/@react-refresh'"));
        assert!(fallback_html.contains("\"/vite-server/@vite/client\""));
        assert!(fallback_html.contains("\"/vite-server/client-main.tsx\""));
        assert!(!fallback_html.contains("http://"));
    }

    #[test]
    fn fallback_html_uses_configured_origin_when_set() {
        let mut app = App::new();
        let mut config: ossido_internal::config::Config = Default::default();
        config.server.origin = Some("https://dev.example.com".to_string());
        app.config = Some(config);

        let source_builder = SourceBuilder {
            app,
            mode: Mode::Dev,
            base_path: PathBuf::new(),
            types_jar: TypesJar::default(),
        };

        let fallback_html = source_builder.build_html_fallback();

        assert!(
            fallback_html.contains("https://dev.example.com/vite-server/@vite/client")
        );
    }
}
