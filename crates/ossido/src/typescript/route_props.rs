use std::collections::BTreeMap;
use std::path::Path;

use glob::glob;
use syn::{Item, ReturnType, Type};

/// Maps a page's URL path (e.g. `/pokemons/[pokemon]`) to the name of the type
/// its `#[ossido_lib::handler]` returns — but only for handlers that return a
/// concrete type (a `#[derive(Props)]` struct), not `Response`. Powers the
/// generated `OssidoPage<'/path'>` helper.
pub fn collect_route_props(base_path: &Path) -> BTreeMap<String, String> {
    collect_handler_types(base_path, "page", route_url_path)
}

/// Maps a layout's directory path (e.g. `/`, `/dashboard`, `/(marketing)`) to
/// the type its `layout.rs` handler returns. Powers `OssidoLayout<'/path'>`. The
/// key keeps route groups (a group layout shares no URL with the root, so `/`
/// and `/(marketing)` must stay distinct).
pub fn collect_layout_props(base_path: &Path) -> BTreeMap<String, String> {
    collect_handler_types(base_path, "layout", layout_dir_path)
}

/// Shared collector: for every `<file_stem>.rs` route file with a concrete
/// `#[handler]` return type, map `path_fn(file)` → type name.
fn collect_handler_types(
    base_path: &Path,
    file_stem: &str,
    path_fn: impl Fn(&Path, &Path) -> Option<String>,
) -> BTreeMap<String, String> {
    let mut map = BTreeMap::new();

    let Some(pattern) = base_path
        .join("src/routes/**/*.rs")
        .to_str()
        .map(str::to_string)
    else {
        return map;
    };

    let Ok(entries) = glob(&pattern) else {
        return map;
    };

    for entry in entries.flatten() {
        if entry.file_stem().and_then(|stem| stem.to_str()) != Some(file_stem) {
            continue;
        }
        if let (Some(key), Some(type_name)) =
            (path_fn(base_path, &entry), handler_return_type(&entry))
        {
            map.insert(key, type_name);
        }
    }

    map
}

/// The URL path for a page file: `src/routes/page.rs` → `/`,
/// `src/routes/test/page.rs` → `/test`, `src/routes/pokemons/[pokemon]/page.rs`
/// → `/pokemons/[pokemon]`.
fn route_url_path(base_path: &Path, file: &Path) -> Option<String> {
    let path = route_file_path(base_path, file)?;
    // A route lives in `<dir>/page.rs`, so the URL is its directory; the root
    // `page.rs` becomes `/`.
    let path = match path.strip_suffix("/page") {
        Some("") => "/".to_string(),
        Some(stripped) => stripped.to_string(),
        None => path,
    };

    // Route groups like `(marketing)` add no URL segment.
    let stripped = crate::route::strip_route_groups(&path);
    Some(if stripped.is_empty() {
        "/".to_string()
    } else {
        stripped
    })
}

/// The directory path for a layout file: `src/routes/layout.rs` → `/`,
/// `src/routes/dashboard/layout.rs` → `/dashboard`,
/// `src/routes/(marketing)/layout.rs` → `/(marketing)`. Groups are kept (each
/// directory has exactly one layout, so this is unique).
fn layout_dir_path(base_path: &Path, file: &Path) -> Option<String> {
    let path = route_file_path(base_path, file)?;
    Some(match path.strip_suffix("/layout") {
        Some("") => "/".to_string(),
        Some(stripped) => stripped.to_string(),
        None => path,
    })
}

/// The route file path relative to `src/routes`, leading-slashed and without the
/// `.rs` extension (`/(marketing)/about/page`).
fn route_file_path(base_path: &Path, file: &Path) -> Option<String> {
    let relative = file.strip_prefix(base_path.join("src/routes")).ok()?;
    let relative = relative.to_string_lossy().replace('\\', "/");
    let without_ext = relative.strip_suffix(".rs").unwrap_or(&relative);
    Some(format!("/{without_ext}"))
}

/// The concrete type a route's handler returns, or `None` when there's no
/// `#[handler]` or it returns `Response` (strict — untyped routes are omitted).
fn handler_return_type(file: &Path) -> Option<String> {
    let source = std::fs::read_to_string(file).ok()?;
    // Cheap filter before invoking the parser.
    if !source.contains("handler") {
        return None;
    }

    let parsed = syn::parse_file(&source).ok()?;
    for item in parsed.items {
        let Item::Fn(func) = item else { continue };
        if !is_handler(&func.attrs) {
            continue;
        }
        if let ReturnType::Type(_, ty) = func.sig.output {
            return concrete_type_name(&ty);
        }
    }
    None
}

fn is_handler(attrs: &[syn::Attribute]) -> bool {
    attrs.iter().any(|attr| {
        attr.path()
            .segments
            .last()
            .is_some_and(|segment| segment.ident == "handler")
    })
}

/// The type name if it is a plain path type other than `Response`.
fn concrete_type_name(ty: &Type) -> Option<String> {
    let Type::Path(type_path) = ty else {
        return None;
    };
    let ident = &type_path.path.segments.last()?.ident;
    if ident == "Response" {
        return None;
    }
    Some(ident.to_string())
}

/// Render the `RouteProps`/`OssidoPage` and `LayoutProps`/`OssidoLayout` helpers,
/// to be inserted inside the generated `declare module "ossido/types"` block.
pub fn render_route_props(
    route_props: &BTreeMap<String, String>,
    layout_props: &BTreeMap<String, String>,
) -> String {
    let mut typescript = String::from("export interface RouteProps {\n");
    for (path, type_name) in route_props {
        typescript.push_str(&format!("  \"{path}\": {type_name}\n"));
    }
    typescript.push_str("}\n");
    typescript.push_str(
        "export type OssidoPage<Path extends keyof RouteProps> = (\n  props: RouteProps[Path],\n) => import(\"react\").ReactNode\n",
    );

    typescript.push_str("export interface LayoutProps {\n");
    for (path, type_name) in layout_props {
        typescript.push_str(&format!("  \"{path}\": {type_name}\n"));
    }
    typescript.push_str("}\n");
    typescript.push_str(
        "export type OssidoLayout<Path extends keyof LayoutProps> = (\n  props: LayoutProps[Path] & { children: import(\"react\").ReactNode },\n) => import(\"react\").ReactNode\n",
    );

    typescript
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::*;

    #[test]
    fn maps_page_to_directory_and_keeps_dynamic_segments() {
        let base = PathBuf::from("/app");
        assert_eq!(
            route_url_path(&base, &base.join("src/routes/page.rs")).as_deref(),
            Some("/")
        );
        assert_eq!(
            route_url_path(&base, &base.join("src/routes/test/page.rs")).as_deref(),
            Some("/test")
        );
        assert_eq!(
            route_url_path(&base, &base.join("src/routes/pokemons/[pokemon]/page.rs")).as_deref(),
            Some("/pokemons/[pokemon]")
        );
        // Route groups add no URL segment.
        assert_eq!(
            route_url_path(&base, &base.join("src/routes/(marketing)/about/page.rs")).as_deref(),
            Some("/about")
        );
    }

    #[test]
    fn maps_layout_to_its_directory_keeping_groups() {
        let base = PathBuf::from("/app");
        assert_eq!(
            layout_dir_path(&base, &base.join("src/routes/layout.rs")).as_deref(),
            Some("/")
        );
        assert_eq!(
            layout_dir_path(&base, &base.join("src/routes/dashboard/layout.rs")).as_deref(),
            Some("/dashboard")
        );
        // A group layout keeps its group so it stays distinct from the root.
        assert_eq!(
            layout_dir_path(&base, &base.join("src/routes/(marketing)/layout.rs")).as_deref(),
            Some("/(marketing)")
        );
    }

    #[test]
    fn extracts_concrete_handler_return_type_only() {
        assert_eq!(
            concrete_type_name(&syn::parse_str::<Type>("MyResponse").unwrap()),
            Some("MyResponse".to_string())
        );
        assert_eq!(
            concrete_type_name(&syn::parse_str::<Type>("Response").unwrap()),
            None
        );
        assert_eq!(
            concrete_type_name(&syn::parse_str::<Type>("ossido_lib::Response").unwrap()),
            None
        );
    }
}
