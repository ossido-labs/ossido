use std::collections::HashMap;
use std::fs::File;
use std::io;
use std::path::{Path, PathBuf};
use std::str::FromStr;

use fs_extra::dir::create_all;
use http::Method;
use regex::Regex;
use reqwest::blocking::Client;
use serde::Deserialize;
use syn::{Attribute, Ident, Item, Meta};
use tracing::trace;

use crate::macro_attr::is_ossido_attr;

/// One dynamic slot's value in a `#[static_paths]` entry, as returned by the
/// enumeration endpoint: a single segment (`[param]`) or an ordered list
/// (`[...catchall]`). Mirrors `ossido_lib::SegmentValue`'s untagged JSON.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(untagged)]
enum SegmentValue {
    One(String),
    Many(Vec<String>),
}

/// The params for one page to generate: slot name → value.
type ParamSet = HashMap<String, SegmentValue>;

fn has_dynamic_path(route: &str) -> bool {
    let regex = Regex::new(r"\[(.*?)\]").expect("Failed to create the regex");
    regex.is_match(route)
}

/// Strip route-group segments — a path segment wrapped in parens, e.g.
/// `(marketing)` — from a URL. They organize files and share layouts without
/// contributing a URL segment. Returns "" when nothing but groups remain (the
/// caller maps that to "/").
pub(crate) fn strip_route_groups(path: &str) -> String {
    let group_re = Regex::new(r"\([^)]*\)").expect("Failed to create the group regex");
    let without_groups = group_re.replace_all(path, "");
    let slash_re = Regex::new(r"/{2,}").expect("Failed to create the slash regex");
    slash_re
        .replace_all(&without_groups, "/")
        .trim_end_matches('/')
        .to_string()
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct AxumInfo {
    // Path for importing the module
    pub module_import: String,
    // path for the the axum router
    pub axum_route: String,
}

impl AxumInfo {
    pub fn new(route: &Route) -> Self {
        // Remove first slash
        let mut module = route.path.chars();
        module.next();

        // A route lives in `<dir>/page.rs`; the URL is the directory, so drop the
        // trailing `/page`. The `#[path]`/module still point at the real file.
        let axum_route = route
            .path
            .strip_suffix("/page")
            .map(str::to_string)
            .unwrap_or_else(|| route.path.clone());
        // Route groups add no URL segment (the `#[path]`/module still points at
        // the parenthesised folder, so the module name just drops the parens).
        let axum_route = strip_route_groups(&axum_route);

        let module_import = module
            .as_str()
            .to_string()
            .replace('/', "_")
            .replace('.', "_dot_")
            .replace('-', "_hyphen_")
            .replace(['(', ')'], "")
            .to_lowercase();

        if axum_route.is_empty() {
            return AxumInfo {
                module_import,
                axum_route: "/".to_string(),
            };
        }

        if route.is_dynamic {
            let dyn_re = Regex::new(r"\[(.*?)\]").expect("Failed to create dyn regex");
            let catch_all_re =
                Regex::new(r"\{\.\.\.(.*?)\}").expect("Failed to create catch all regex");

            let dyn_result = dyn_re.replace_all(&axum_route, |caps: &regex::Captures| {
                format!("{{{}}}", &caps[1])
            });

            let axum_route = catch_all_re
                .replace_all(&dyn_result, |caps: &regex::Captures| {
                    format!("{{*{}}}", &caps[1])
                })
                .to_string();

            return AxumInfo {
                module_import: module
                    .as_str()
                    .to_string()
                    .replace('/', "_")
                    .replace('-', "_hyphen_")
                    .replace('[', "dyn_")
                    .replace("...", "catch_all_")
                    .replace(']', "")
                    .replace(['(', ')'], ""),
                axum_route,
            };
        }

        AxumInfo {
            module_import,
            axum_route,
        }
    }
}

// TODO: to be extended with common scenarios
const NO_HTML_EXTENSIONS: [&str; 2] = ["xml", "txt"];

/// The HTTP method declared by a single attribute, if it is an `#[api(METHOD)]`
/// (imported or fully-qualified `#[ossido_lib::api(METHOD)]`). An unrecognised
/// method identifier falls back to `GET`.
fn api_method_from_attr(attr: &Attribute) -> Option<Method> {
    let Meta::List(list) = &attr.meta else {
        return None;
    };
    if !is_ossido_attr(&list.path, "api") {
        return None;
    }

    // The method is the single identifier inside the parens, e.g. `GET`.
    let method = syn::parse2::<Ident>(list.tokens.clone())
        .ok()
        .and_then(|ident| Method::from_str(&ident.to_string().to_uppercase()).ok())
        .unwrap_or(Method::GET);
    Some(method)
}

/// Extract the HTTP methods declared by `#[api(METHOD)]` attributes in a file's
/// contents by parsing the file's AST (robust to comments, string literals and
/// formatting, unlike text matching). A file that does not parse yields no
/// methods; the subsequent compile surfaces the syntax error.
fn parse_api_methods(content: &str) -> Vec<Method> {
    let Ok(file) = syn::parse_file(content) else {
        return Vec::new();
    };

    file.items
        .iter()
        .filter_map(|item| match item {
            Item::Fn(func) => Some(&func.attrs),
            _ => None,
        })
        .flat_map(|attrs| attrs.iter().filter_map(api_method_from_attr))
        .collect()
}

fn read_http_methods_from_file(path: &String) -> Vec<Method> {
    let file = fs_extra::file::read_to_string(path).expect("Failed to read API file");
    parse_api_methods(&file)
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct ApiData {
    pub methods: Vec<Method>,
}

impl ApiData {
    pub fn new(path: &String) -> Option<Self> {
        if !path.starts_with("/api/") {
            return None;
        }

        let base_path = std::env::current_dir().expect("Failed to get the base_path");

        let file_path = base_path
            .join(format!("src/routes{path}.rs"))
            .to_str()
            .unwrap()
            .to_string();
        let methods = read_http_methods_from_file(&file_path);

        Some(ApiData { methods })
    }
}

/// Whether a route file path refers to a `layout` data handler (`layout.rs`) —
/// the root `/layout` or a nested `<dir>/layout`.
pub(crate) fn is_layout_path(path: &str) -> bool {
    path == "/layout" || path.ends_with("/layout")
}

/// Whether a route file's contents declare a `#[static_paths]` (or
/// `#[ossido_lib::static_paths]`) enumerator, parsing the AST so comments and
/// string literals can't produce a false positive. A file that does not parse
/// yields `false`; the subsequent compile surfaces the syntax error.
fn file_declares_static_paths(content: &str) -> bool {
    let Ok(file) = syn::parse_file(content) else {
        return false;
    };

    file.items.iter().any(|item| match item {
        Item::Fn(func) => func
            .attrs
            .iter()
            .any(|attr| is_ossido_attr(attr.path(), "static_paths")),
        _ => false,
    })
}

/// Whether the `page.rs` at `path` declares a `#[static_paths]` enumerator.
/// Resolves the file relative to the current project (`src/routes{path}.rs`);
/// a missing/unreadable file simply yields `false`.
fn route_declares_static_paths(path: &str) -> bool {
    let Ok(base_path) = std::env::current_dir() else {
        return false;
    };
    let file_path = base_path.join(format!("src/routes{path}.rs"));
    let Ok(content) = std::fs::read_to_string(&file_path) else {
        return false;
    };
    file_declares_static_paths(&content)
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct Route {
    pub path: String,
    pub is_dynamic: bool,
    /// A `layout.rs` data handler. It has no standalone SSR/data route of its
    /// own — its props are composed into the SSR + data map of every page it
    /// wraps.
    pub is_layout: bool,
    /// Whether this (dynamic) route's `page.rs` declares a `#[static_paths]`
    /// enumerator, so `ossido build --static` can generate its concrete pages
    /// instead of aborting. Only meaningful for dynamic routes.
    pub has_static_paths: bool,
    pub axum_info: Option<AxumInfo>,
    pub api_data: Option<ApiData>,
}

impl Route {
    pub fn new(cleaned_path: String) -> Self {
        let is_dynamic = has_dynamic_path(&cleaned_path);
        Route {
            is_layout: is_layout_path(&cleaned_path),
            // Only dynamic routes need (and are checked for) an enumerator.
            has_static_paths: is_dynamic && route_declares_static_paths(&cleaned_path),
            path: cleaned_path.clone(),
            axum_info: None,
            is_dynamic,
            api_data: ApiData::new(&cleaned_path),
        }
    }

    pub fn is_api(&self) -> bool {
        self.api_data.is_some()
    }

    /// The public URL for this route: the file path with the trailing `/page`
    /// dropped and route groups removed (`/about/page` → `/about`, `/page` →
    /// `/`). Non-page paths (e.g. `/sitemap.xml`) are returned unchanged.
    pub(crate) fn url_path(&self) -> String {
        let stripped = self.path.strip_suffix("/page").unwrap_or(&self.path);
        let stripped = strip_route_groups(stripped);
        if stripped.is_empty() {
            "/".to_string()
        } else {
            stripped
        }
    }

    pub fn update_axum_info(&mut self) {
        self.axum_info = Some(AxumInfo::new(self))
    }

    pub fn save_ssg_file(&self, reqwest: &Client) -> Result<(), String> {
        // Layouts have no standalone page; APIs return JSON, not HTML.
        if self.is_api() || self.is_layout {
            return Ok(());
        }

        // A static route renders a single page at its own URL.
        if !self.is_dynamic {
            return self.save_page(reqwest, &self.url_path());
        }

        // A dynamic route enumerates its pages via `#[static_paths]` (guaranteed
        // present — `ossido build --static` aborts earlier otherwise). Each param
        // set is substituted into the route pattern to form one concrete URL.
        let pattern = self.url_path();
        for params in self.fetch_static_paths(reqwest)? {
            let concrete = concrete_path(&pattern, &params)?;
            self.save_page(reqwest, &concrete)?;
        }
        Ok(())
    }

    /// Fetch the enumerated param sets from this dynamic route's
    /// `#[static_paths]` endpoint (`/__ossido/static_paths/<module>`).
    fn fetch_static_paths(&self, reqwest: &Client) -> Result<Vec<ParamSet>, String> {
        let module = &self
            .axum_info
            .as_ref()
            .ok_or_else(|| format!("Route {} is missing module info", self.path))?
            .module_import;

        let url = format!("http://localhost:3000/__ossido/static_paths/{module}");
        trace!("Requesting static paths: {url}");

        let response = reqwest
            .get(&url)
            .send()
            .map_err(|_| format!("Failed to fetch static paths: {url}"))?;

        if !response.status().is_success() {
            return Err(format!(
                "The static_paths endpoint returned {} for {}",
                response.status(),
                self.url_path()
            ));
        }

        response.json::<Vec<ParamSet>>().map_err(|err| {
            format!(
                "Failed to parse static paths for {}: {err}",
                self.url_path()
            )
        })
    }

    /// Render one concrete page (`path`) and, when the route has a server
    /// handler, its data endpoint — saving both under `out/static`.
    fn save_page(&self, reqwest: &Client, path: &str) -> Result<(), String> {
        let url = format!("http://localhost:3000{path}");

        trace!("Requesting the page: {url}");
        let mut response = reqwest
            .get(&url)
            .send()
            .map_err(|_| format!("Failed to get the response: {url}"))?;

        let file_path = self.output_file_path(path);
        trace!("Saving the HTML file: {file_path:?}");
        write_response_to_file(&mut response, &file_path)?;

        // Saving also the server response (the route's data endpoint).
        if self.axum_info.is_some() {
            trace!("The route is an axum route, saving the JSON file");

            // Request from the live server using the raw path so it matches the
            // codegen'd `/__ossido/data{axum_route}` route — including the root's
            // trailing slash (`/__ossido/data/`).
            let data_url = format!("http://localhost:3000/__ossido/data{path}");
            trace!("Requesting the JSON file: {data_url}");
            let mut response = reqwest
                .get(&data_url)
                .send()
                .map_err(|_| format!("Failed to get the response: {data_url}"))?;

            write_response_to_file(&mut response, &static_data_file_path(path))?;
        }

        Ok(())
    }

    fn output_file_path(&self, url_path: &str) -> PathBuf {
        if NO_HTML_EXTENSIONS
            .iter()
            .any(|extension| self.path.ends_with(extension))
        {
            return PathBuf::from(format!("out/static{url_path}"));
        }

        PathBuf::from(format!("out/static{url_path}/index.html"))
    }
}

/// Substitute a `#[static_paths]` param set into a dynamic route pattern to form
/// one concrete URL, validating that every `[…]` slot is filled with the right
/// kind of value and that no extra params are supplied. `[name]` consumes a
/// single segment; `[...name]` consumes an ordered list of segments.
fn concrete_path(pattern: &str, params: &ParamSet) -> Result<String, String> {
    let mut out = String::new();
    let mut consumed = 0usize;

    for segment in pattern.split('/').filter(|segment| !segment.is_empty()) {
        if let Some(name) = segment
            .strip_prefix("[...")
            .and_then(|rest| rest.strip_suffix(']'))
        {
            match params.get(name) {
                Some(SegmentValue::Many(segments)) => {
                    for part in segments {
                        out.push('/');
                        out.push_str(part);
                    }
                }
                Some(SegmentValue::One(_)) => {
                    return Err(format!(
                        "static_paths for '{pattern}': catch-all '[...{name}]' needs a list of segments, got a single value"
                    ));
                }
                None => {
                    return Err(format!(
                        "static_paths for '{pattern}': missing catch-all param '{name}'"
                    ));
                }
            }
            consumed += 1;
        } else if let Some(name) = segment
            .strip_prefix('[')
            .and_then(|rest| rest.strip_suffix(']'))
        {
            match params.get(name) {
                Some(SegmentValue::One(value)) => {
                    out.push('/');
                    out.push_str(value);
                }
                Some(SegmentValue::Many(_)) => {
                    return Err(format!(
                        "static_paths for '{pattern}': param '[{name}]' needs a single segment, got a list"
                    ));
                }
                None => {
                    return Err(format!(
                        "static_paths for '{pattern}': missing param '{name}'"
                    ));
                }
            }
            consumed += 1;
        } else {
            out.push('/');
            out.push_str(segment);
        }
    }

    if consumed != params.len() {
        return Err(format!(
            "static_paths for '{pattern}': entry has {} param(s) but the route has {consumed} dynamic slot(s)",
            params.len()
        ));
    }

    if out.is_empty() {
        out.push('/');
    }
    Ok(out)
}

/// Output file for a page's data JSON, matching the URL the router fetches in a
/// static export (`resourceCache`'s static-mode URL): `out/static/__ossido/data{path}.json`,
/// with the root written as `data.json` (not `data/.json`) to avoid a dotfile /
/// dir-vs-file clash.
fn static_data_file_path(path: &str) -> PathBuf {
    if path == "/" {
        PathBuf::from("out/static/__ossido/data.json")
    } else {
        PathBuf::from(format!("out/static/__ossido/data{path}.json"))
    }
}

/// Create `file_path`'s parent directory (if needed) and stream `response` into
/// it. Shared by the page-HTML and data-JSON writes.
fn write_response_to_file(
    response: &mut reqwest::blocking::Response,
    file_path: &Path,
) -> Result<(), String> {
    let Some(parent_dir) = file_path.parent() else {
        return Err(format!("Failed to get the parent directory {file_path:?}"));
    };

    if !parent_dir.is_dir()
        && let Err(err) = create_all(parent_dir, false)
    {
        return Err(format!(
            "Failed to create the parent directory {parent_dir:?}\nError: {err}"
        ));
    }

    let mut file =
        File::create(file_path).map_err(|_| format!("Failed to create the file: {file_path:?}"))?;

    io::copy(response, &mut file)
        .map_err(|_| format!("Failed to write the file: {file_path:?}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_api_methods_in_both_imported_and_qualified_forms() {
        // Imported form.
        assert_eq!(
            parse_api_methods("#[api(GET)]\nasync fn h() {}"),
            vec![Method::GET]
        );
        // Fully-qualified form.
        assert_eq!(
            parse_api_methods("#[ossido_lib::api(POST)]\nasync fn h() {}"),
            vec![Method::POST]
        );
        // Multiple methods in one file, case-insensitive.
        assert_eq!(
            parse_api_methods(
                "#[api(get)]\nasync fn a() {}\n#[ossido_lib::api(Delete)]\nasync fn b() {}"
            ),
            vec![Method::GET, Method::DELETE]
        );
    }

    #[test]
    fn parse_api_methods_ignores_non_api_attributes_and_bodies() {
        // A function with no `#[api]` attribute, and an `api(...)` call in the
        // body that text matching would have wrongly picked up.
        assert!(parse_api_methods("async fn not_an_api() { let _ = api(\"GET\"); }").is_empty());
    }

    #[test]
    fn parse_api_methods_returns_empty_for_unparseable_input() {
        assert!(parse_api_methods("#[api(GET)] this is not valid rust {{{").is_empty());
    }

    #[test]
    fn detects_static_paths_in_both_imported_and_qualified_forms() {
        assert!(file_declares_static_paths(
            "#[static_paths]\nasync fn static_paths(paths: &mut StaticPaths) {}"
        ));
        assert!(file_declares_static_paths(
            "#[ossido_lib::static_paths]\nasync fn sp(paths: &mut StaticPaths) {}"
        ));
    }

    #[test]
    fn does_not_detect_static_paths_when_absent_or_unparseable() {
        // A handler-only file has no enumerator.
        assert!(!file_declares_static_paths(
            "#[handler]\nasync fn get_server_side_props(req: Request) -> Response { todo!() }"
        ));
        // A `static_paths(...)` call in a body must not be picked up.
        assert!(!file_declares_static_paths(
            "async fn f() { let _ = static_paths(); }"
        ));
        // Unparseable input yields false rather than panicking.
        assert!(!file_declares_static_paths(
            "#[static_paths] not valid rust {{{"
        ));
    }

    #[test]
    fn should_find_dynamic_paths() {
        let routes = [
            ("/home/user/Documents/ossido/src/routes/about/page.rs", false),
            ("/home/user/Documents/ossido/src/routes/page.rs", false),
            ("/home/user/Documents/ossido/src/routes/posts/page.rs", false),
            (
                "/home/user/Documents/ossido/src/routes/posts/[post]/page.rs",
                true,
            ),
        ];

        routes
            .into_iter()
            .for_each(|route| assert_eq!(has_dynamic_path(route.0), route.1));
    }

    #[test]
    fn should_strip_the_page_segment_from_the_url() {
        let root_route = AxumInfo::new(&Route::new("/page".to_string()));
        // A directory whose name contains "page" is only stripped once (trailing).
        let nested_route = AxumInfo::new(&Route::new("/index-page/page".to_string()));

        assert_eq!(root_route.axum_route, "/");
        assert_eq!(root_route.module_import, "page");

        assert_eq!(nested_route.axum_route, "/index-page");
        assert_eq!(nested_route.module_import, "index_hyphen_page_page");
    }

    #[test]
    fn should_correctly_create_the_axum_infos() {
        let info = AxumInfo::new(&Route::new("/page".to_string()));

        assert_eq!(info.axum_route, "/");
        assert_eq!(info.module_import, "page");

        let dyn_info = AxumInfo::new(&Route::new("/[posts]/page".to_string()));

        assert_eq!(dyn_info.axum_route, "/{posts}");
        assert_eq!(dyn_info.module_import, "dyn_posts_page");
    }

    #[test]
    fn should_define_the_correct_html_build_path() {
        let routes = [
            ("/page", "out/static/index.html"),
            ("/documentation/page", "out/static/documentation/index.html"),
            ("/sitemap.xml", "out/static/sitemap.xml"),
            ("/robot.txt", "out/static/robot.txt"),
            (
                "/documentation/routing/page",
                "out/static/documentation/routing/index.html",
            ),
        ];

        for (path, html) in routes {
            let route = Route::new(path.to_string());

            assert_eq!(
                route.output_file_path(&route.url_path()),
                PathBuf::from(html)
            )
        }
    }

    fn param_set(entries: &[(&str, SegmentValue)]) -> ParamSet {
        entries
            .iter()
            .map(|(name, value)| (name.to_string(), value.clone()))
            .collect()
    }

    #[test]
    fn concrete_path_substitutes_single_and_catchall_slots() {
        // Single dynamic param.
        assert_eq!(
            concrete_path(
                "/pokemons/[pokemon]",
                &param_set(&[("pokemon", SegmentValue::One("pikachu".into()))]),
            ),
            Ok("/pokemons/pikachu".to_string())
        );

        // Catch-all expands to multiple segments.
        assert_eq!(
            concrete_path(
                "/docs/[...slug]",
                &param_set(&[(
                    "slug",
                    SegmentValue::Many(vec!["getting-started".into(), "install".into()]),
                )]),
            ),
            Ok("/docs/getting-started/install".to_string())
        );

        // A param and a catch-all in one route.
        assert_eq!(
            concrete_path(
                "/[param]/[...catchall]",
                &param_set(&[
                    ("param", SegmentValue::One("hello".into())),
                    ("catchall", SegmentValue::Many(vec!["a".into(), "b".into()])),
                ]),
            ),
            Ok("/hello/a/b".to_string())
        );
    }

    #[test]
    fn concrete_path_validates_missing_wrong_kind_and_extra_params() {
        // Missing param.
        assert!(concrete_path("/pokemons/[pokemon]", &param_set(&[])).is_err());

        // Single value given for a catch-all slot.
        assert!(
            concrete_path(
                "/docs/[...slug]",
                &param_set(&[("slug", SegmentValue::One("a".into()))]),
            )
            .is_err()
        );

        // List given for a single-segment slot.
        assert!(
            concrete_path(
                "/pokemons/[pokemon]",
                &param_set(&[("pokemon", SegmentValue::Many(vec!["a".into(), "b".into()]))]),
            )
            .is_err()
        );

        // Extra param that no slot consumes.
        assert!(
            concrete_path(
                "/pokemons/[pokemon]",
                &param_set(&[
                    ("pokemon", SegmentValue::One("pikachu".into())),
                    ("extra", SegmentValue::One("x".into())),
                ]),
            )
            .is_err()
        );
    }
}
