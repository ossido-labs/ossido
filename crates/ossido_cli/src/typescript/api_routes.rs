use std::path::Path;

use glob::glob;
use syn::{GenericArgument, Item, ItemFn, PathArguments, ReturnType, Type};

/// One `#[api(METHOD)]` handler: its HTTP method (uppercase) and the concrete
/// JSON response type, if any.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ApiMethod {
    pub method: String,
    /// The inner type of an `axum::Json<T>` return (`T`), referenced later as
    /// `import("@ossido-labs/ossido/types").T`. `None` for opaque returns (`StatusCode`,
    /// `Response`, `impl IntoResponse`, …), which type as `unknown`.
    pub response: Option<String>,
}

/// One API route file: its URL path (with `[param]` segments) and the methods it
/// serves.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ApiRoute {
    pub path: String,
    pub methods: Vec<ApiMethod>,
}

/// Collect every `src/routes/api/**/*.rs` route: its URL path and, per HTTP
/// method, the JSON response type. Powers the generated `apiClient` typing
/// (`declare module "@ossido-labs/ossido/client"`).
pub fn collect_api_routes(base_path: &Path) -> Vec<ApiRoute> {
    let mut routes = Vec::new();

    let Some(pattern) = base_path
        .join("src/routes/api/**/*.rs")
        .to_str()
        .map(str::to_string)
    else {
        return routes;
    };

    let Ok(entries) = glob(&pattern) else {
        return routes;
    };

    for entry in entries.flatten() {
        let Some(path) = api_url_path(base_path, &entry) else {
            continue;
        };
        let Ok(source) = std::fs::read_to_string(&entry) else {
            continue;
        };
        // Cheap filter before invoking the parser.
        if !source.contains("api") {
            continue;
        }
        let Ok(parsed) = syn::parse_file(&source) else {
            continue;
        };

        let methods: Vec<ApiMethod> = parsed
            .items
            .iter()
            .filter_map(|item| match item {
                Item::Fn(func) => api_method(func),
                _ => None,
            })
            .collect();

        if !methods.is_empty() {
            routes.push(ApiRoute { path, methods });
        }
    }

    routes.sort_by(|a, b| a.path.cmp(&b.path));
    routes
}

/// The URL path for an API route file, relative to `src/routes`, leading-slashed
/// and without the `.rs` extension: `src/routes/api/users/[id].rs` →
/// `/api/users/[id]`. Only `/api/...` files qualify.
fn api_url_path(base_path: &Path, file: &Path) -> Option<String> {
    let relative = file.strip_prefix(base_path.join("src/routes")).ok()?;
    let relative = relative.to_string_lossy().replace('\\', "/");
    let without_ext = relative.strip_suffix(".rs")?;
    let path = format!("/{without_ext}");
    path.starts_with("/api/").then_some(path)
}

/// The `[param]` / `[...catchall]` segment names in a path, in order.
fn params_from_path(path: &str) -> Vec<String> {
    path.split('/')
        .filter_map(|segment| {
            let inner = segment.strip_prefix('[')?.strip_suffix(']')?;
            Some(inner.strip_prefix("...").unwrap_or(inner).to_string())
        })
        .collect()
}

/// The method + response type for a function, if it carries `#[api(METHOD)]`.
fn api_method(func: &ItemFn) -> Option<ApiMethod> {
    let method = func.attrs.iter().find_map(api_method_from_attr)?;
    let response = match &func.sig.output {
        ReturnType::Type(_, ty) => json_inner_type_name(ty),
        ReturnType::Default => None,
    };
    Some(ApiMethod { method, response })
}

/// The uppercase HTTP method from an `#[api(METHOD)]` (or `#[ossido::api(...)]`)
/// attribute.
fn api_method_from_attr(attr: &syn::Attribute) -> Option<String> {
    let last = attr.path().segments.last()?;
    if last.ident != "api" {
        return None;
    }
    let method = attr.parse_args::<syn::Ident>().ok()?;
    Some(method.to_string().to_uppercase())
}

/// The inner type name of an `axum::Json<T>` return type (`T`), or `None` for
/// anything else.
fn json_inner_type_name(ty: &Type) -> Option<String> {
    let Type::Path(type_path) = ty else {
        return None;
    };
    let segment = type_path.path.segments.last()?;
    if segment.ident != "Json" {
        return None;
    }
    let PathArguments::AngleBracketed(args) = &segment.arguments else {
        return None;
    };
    let GenericArgument::Type(Type::Path(inner)) = args.args.first()? else {
        return None;
    };
    Some(inner.path.segments.last()?.ident.to_string())
}

/// Render the `apiClient` route map as a merge into the global `OssidoApiRoutes`
/// interface that `@ossido-labs/ossido/client` reads. Returns an empty string
/// when there are no API routes.
///
/// A global interface (not a `declare module` augmentation) is used on purpose:
/// `.ossido/types.ts` is a global script, so a `declare module` there would
/// *shadow* the real `@ossido-labs/ossido/client` module — hiding `apiClient` —
/// rather than augment it. Global interfaces merge across files without that
/// hazard.
pub fn render_api_routes(routes: &[ApiRoute]) -> String {
    if routes.is_empty() {
        return String::new();
    }

    let mut ts = String::from("interface OssidoApiRoutes {\n");

    for route in routes {
        let params = params_from_path(&route.path);
        let params_ts = if params.is_empty() {
            "Record<string, never>".to_string()
        } else {
            let fields = params
                .iter()
                .map(|name| format!("{name}: string"))
                .collect::<Vec<_>>()
                .join("; ");
            format!("{{ {fields} }}")
        };

        ts.push_str(&format!("  \"{}\": {{\n", route.path));
        for ApiMethod { method, response } in &route.methods {
            let response_ts = match response {
                Some(name) => format!("import(\"@ossido-labs/ossido/types\").{name}"),
                None => "unknown".to_string(),
            };
            ts.push_str(&format!(
                "    {method}: {{ params: {params_ts}; response: {response_ts} }}\n"
            ));
        }
        ts.push_str("  }\n");
    }

    ts.push_str("}\n");
    ts
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn params_are_extracted_from_dynamic_segments() {
        assert_eq!(params_from_path("/api/health"), Vec::<String>::new());
        assert_eq!(params_from_path("/api/users/[id]"), vec!["id"]);
        assert_eq!(
            params_from_path("/api/[org]/repos/[repo]"),
            vec!["org", "repo"]
        );
        assert_eq!(params_from_path("/api/docs/[...slug]"), vec!["slug"]);
    }

    #[test]
    fn json_return_types_yield_the_inner_type() {
        let json: ReturnType = syn::parse_str("-> Json<Pokemon>").unwrap();
        let ReturnType::Type(_, ty) = json else {
            panic!()
        };
        assert_eq!(json_inner_type_name(&ty), Some("Pokemon".to_string()));

        // Fully-qualified path.
        let qualified: ReturnType = syn::parse_str("-> ossido::axum::Json<User>").unwrap();
        let ReturnType::Type(_, ty) = qualified else {
            panic!()
        };
        assert_eq!(json_inner_type_name(&ty), Some("User".to_string()));

        // Opaque returns type as `unknown` (None).
        let status: ReturnType = syn::parse_str("-> StatusCode").unwrap();
        let ReturnType::Type(_, ty) = status else {
            panic!()
        };
        assert_eq!(json_inner_type_name(&ty), None);
    }

    #[test]
    fn method_is_read_from_the_api_attribute() {
        let func: ItemFn =
            syn::parse_str("#[api(POST)] async fn create(req: Request) -> Json<User> { todo!() }")
                .unwrap();
        let method = api_method(&func).unwrap();
        assert_eq!(method.method, "POST");
        assert_eq!(method.response, Some("User".to_string()));

        // A non-api function is ignored.
        let plain: ItemFn = syn::parse_str("async fn helper() {}").unwrap();
        assert_eq!(api_method(&plain), None);
    }

    #[test]
    fn renders_the_register_augmentation() {
        let routes = vec![
            ApiRoute {
                path: "/api/health".to_string(),
                methods: vec![ApiMethod {
                    method: "GET".to_string(),
                    response: None,
                }],
            },
            ApiRoute {
                path: "/api/users/[id]".to_string(),
                methods: vec![ApiMethod {
                    method: "GET".to_string(),
                    response: Some("User".to_string()),
                }],
            },
        ];
        let ts = render_api_routes(&routes);
        assert!(ts.contains("interface OssidoApiRoutes {"));
        assert!(ts.contains("\"/api/health\": {"));
        assert!(ts.contains("GET: { params: Record<string, never>; response: unknown }"));
        assert!(ts.contains(
            "GET: { params: { id: string }; response: import(\"@ossido-labs/ossido/types\").User }"
        ));

        // No routes → no augmentation.
        assert_eq!(render_api_routes(&[]), "");
    }
}
