use std::fs::File;
use std::io;
use std::path::PathBuf;
use std::str::FromStr;

use fs_extra::dir::create_all;
use http::Method;
use regex::Regex;
use reqwest::Url;
use reqwest::blocking::Client;
use syn::{Attribute, Ident, Item, Meta};
use tracing::trace;

use crate::macro_attr::is_tuono_attr;

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
/// (imported or fully-qualified `#[tuono_lib::api(METHOD)]`). An unrecognised
/// method identifier falls back to `GET`.
fn api_method_from_attr(attr: &Attribute) -> Option<Method> {
    let Meta::List(list) = &attr.meta else {
        return None;
    };
    if !is_tuono_attr(&list.path, "api") {
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

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct Route {
    pub path: String,
    pub is_dynamic: bool,
    /// A `layout.rs` data handler. It has no standalone SSR/data route of its
    /// own — its props are composed into the SSR + data map of every page it
    /// wraps.
    pub is_layout: bool,
    pub axum_info: Option<AxumInfo>,
    pub api_data: Option<ApiData>,
}

impl Route {
    pub fn new(cleaned_path: String) -> Self {
        Route {
            is_layout: is_layout_path(&cleaned_path),
            path: cleaned_path.clone(),
            axum_info: None,
            is_dynamic: has_dynamic_path(&cleaned_path),
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
        // Layouts have no standalone page to statically render.
        if self.is_api() || self.is_layout {
            return Ok(());
        }

        let path = &self.url_path();

        let url = format!("http://localhost:3000{path}");

        trace!("Requesting the page: {}", url);
        let mut response = match reqwest.get(format!("http://localhost:3000{path}")).send() {
            Ok(response) => response,
            Err(_) => return Err(format!("Failed to get the response: {url}")),
        };

        let file_path = self.output_file_path();

        let parent_dir = match file_path.parent() {
            Some(parent_dir) => parent_dir,
            None => {
                return Err(format!("Failed to get the parent directory {file_path:?}"));
            }
        };

        if !parent_dir.is_dir()
            && let Err(err) = create_all(parent_dir, false)
        {
            return Err(format!(
                "Failed to create the parent directory {parent_dir:?}\nError: {err}"
            ));
        }

        trace!("Saving the HTML file: {:?}", file_path);

        let mut file = match File::create(&file_path) {
            Ok(file) => file,
            Err(_) => return Err(format!("Failed to create the file: {file_path:?}")),
        };

        if io::copy(&mut response, &mut file).is_err() {
            return Err(format!("Failed to write the file: {file_path:?}"));
        }

        // Saving also the server response
        if self.axum_info.is_some() {
            trace!("The route is an axum route, saving the JSON file");

            let data_file_path = PathBuf::from(&format!("out/static/__tuono/data{path}.json"));

            let data_parent_dir = match data_file_path.parent() {
                Some(parent_dir) => parent_dir,
                None => {
                    return Err(format!(
                        "Failed to get the parent directory {data_file_path:?}"
                    ));
                }
            };

            if !data_parent_dir.is_dir()
                && let Err(err) = create_all(data_parent_dir, false)
            {
                return Err(format!(
                    "Failed to create the parent directory {data_parent_dir:?}\n Error: {err}"
                ));
            }

            let base = Url::parse("http://localhost:3000/__tuono/data").unwrap();

            let path = if path == "/" { "" } else { path };

            let pathname = &format!("/__tuono/data{path}");

            let url = base
                .join(pathname)
                .expect("Failed to build the reqwest URL");

            trace!("Requesting the JSON file: {}", url);

            let mut response = match reqwest.get(url.clone()).send() {
                Ok(response) => {
                    trace!("Successfully got the response for: {url}");
                    response
                }
                Err(_) => return Err(format!("Failed to get the response: {url}")),
            };

            let mut data_file = match File::create(&data_file_path) {
                Ok(file) => file,
                Err(_) => {
                    return Err(format!(
                        "Failed to create the JSON file: {data_file_path:?}"
                    ));
                }
            };

            if io::copy(&mut response, &mut data_file).is_err() {
                return Err("Failed to write the JSON file".to_string());
            }
        }

        Ok(())
    }

    fn output_file_path(&self) -> PathBuf {
        let cleaned_path = self.url_path();

        if NO_HTML_EXTENSIONS
            .iter()
            .any(|extension| self.path.ends_with(extension))
        {
            return PathBuf::from(format!("out/static{cleaned_path}"));
        }

        PathBuf::from(format!("out/static{cleaned_path}/index.html"))
    }
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
            parse_api_methods("#[tuono_lib::api(POST)]\nasync fn h() {}"),
            vec![Method::POST]
        );
        // Multiple methods in one file, case-insensitive.
        assert_eq!(
            parse_api_methods(
                "#[api(get)]\nasync fn a() {}\n#[tuono_lib::api(Delete)]\nasync fn b() {}"
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
    fn should_find_dynamic_paths() {
        let routes = [
            ("/home/user/Documents/tuono/src/routes/about/page.rs", false),
            ("/home/user/Documents/tuono/src/routes/page.rs", false),
            ("/home/user/Documents/tuono/src/routes/posts/page.rs", false),
            (
                "/home/user/Documents/tuono/src/routes/posts/[post]/page.rs",
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

            assert_eq!(route.output_file_path(), PathBuf::from(html))
        }
    }
}
