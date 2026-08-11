use std::path::Path;

use glob::glob;
use syn::{FnArg, GenericArgument, Item, ItemFn, PathArguments, ReturnType, Type};

/// One `#[action]` function discovered in an `actions.rs` (or `*.actions.rs`)
/// file: everything needed to register its route and generate its typed
/// TypeScript counterpart.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ActionDef {
    /// The Rust function name (`create_user`).
    pub fn_name: String,
    /// The camelCased TS export name (`createUser`).
    pub ts_name: String,
    /// The mangled key shared by the URL and the module (`newsletter_actions`).
    pub module_key: String,
    /// The `#[path] mod` name (`__ossido_action_newsletter_actions`).
    pub module_import: String,
    /// The file path relative to `src/routes`, without extension
    /// (`newsletter/actions`), for the `#[path]` attribute.
    pub rel_path: String,
    /// The endpoint URL (`/__ossido/action/newsletter_actions/create_user`).
    pub url: String,
    /// The input type name, or `None` for a zero-argument action.
    pub input: Option<String>,
    /// The success/output type name (the `Ok` type of a `Result`, or the bare
    /// return type).
    pub output: String,
    /// The `PrevState<T>` inner type name when the action is stateful
    /// (`useActionState`), else `None`.
    pub prev_state: Option<String>,
}

/// Collect every `#[action]` across `src/routes/**/actions.rs` and
/// `src/routes/**/*.actions.rs`. Actions live in dedicated files so they are not
/// also collected as page/api route modules (which would double-declare the
/// module).
pub fn collect_actions(base_path: &Path) -> Vec<ActionDef> {
    let mut actions = Vec::new();

    let Some(pattern) = base_path
        .join("src/routes/**/*.rs")
        .to_str()
        .map(str::to_string)
    else {
        return actions;
    };

    let Ok(entries) = glob(&pattern) else {
        return actions;
    };

    for entry in entries.flatten() {
        if !is_actions_file(&entry) {
            continue;
        }
        let Some(rel_path) = rel_route_path(base_path, &entry) else {
            continue;
        };
        let Ok(source) = std::fs::read_to_string(&entry) else {
            continue;
        };
        // Cheap filter before invoking the parser.
        if !source.contains("action") {
            continue;
        }
        let Ok(parsed) = syn::parse_file(&source) else {
            continue;
        };

        let module_key = mangle(&rel_path);
        let module_import = format!("__ossido_action_{module_key}");

        for item in &parsed.items {
            let Item::Fn(func) = item else { continue };
            if !is_action(func) {
                continue;
            }
            let fn_name = func.sig.ident.to_string();
            actions.push(ActionDef {
                ts_name: action_custom_name(func).unwrap_or_else(|| to_camel_case(&fn_name)),
                url: format!("/__ossido/action/{module_key}/{fn_name}"),
                input: action_input_type(func),
                output: action_output_type(func),
                prev_state: action_prev_state_type(func),
                fn_name,
                module_key: module_key.clone(),
                module_import: module_import.clone(),
                rel_path: rel_path.clone(),
            });
        }
    }

    actions.sort_by(|a, b| a.url.cmp(&b.url));
    actions
}

/// Whether a file is an actions file: named exactly `actions.rs` or ending in
/// `.actions.rs` (a literal dot, so `reactions.rs` does not match).
fn is_actions_file(file: &Path) -> bool {
    file.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name == "actions.rs" || name.ends_with(".actions.rs"))
        .unwrap_or(false)
}

/// The path relative to `src/routes`, `/`-separated and without the `.rs`
/// extension: `.../src/routes/newsletter/actions.rs` → `newsletter/actions`.
fn rel_route_path(base_path: &Path, file: &Path) -> Option<String> {
    let relative = file.strip_prefix(base_path.join("src/routes")).ok()?;
    let relative = relative.to_string_lossy().replace('\\', "/");
    Some(relative.strip_suffix(".rs").unwrap_or(&relative).to_string())
}

/// Turn a route-relative path into a single safe identifier segment used for
/// both the URL key and the module name: every non-alphanumeric character
/// becomes `_` (`newsletter/actions` → `newsletter_actions`).
fn mangle(rel_path: &str) -> String {
    rel_path
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect()
}

fn to_camel_case(snake: &str) -> String {
    let mut out = String::with_capacity(snake.len());
    let mut upper_next = false;
    for c in snake.chars() {
        if c == '_' {
            upper_next = true;
        } else if upper_next {
            out.extend(c.to_uppercase());
            upper_next = false;
        } else {
            out.push(c);
        }
    }
    out
}

fn action_attr(func: &ItemFn) -> Option<&syn::Attribute> {
    func.attrs.iter().find(|attr| {
        attr.path()
            .segments
            .last()
            .is_some_and(|segment| segment.ident == "action")
    })
}

fn is_action(func: &ItemFn) -> bool {
    action_attr(func).is_some()
}

/// An explicit TypeScript export name from `#[action("createUser")]` or
/// `#[action(createUser)]`. `None` when the attribute has no argument (the name
/// then defaults to the camelCased Rust name).
fn action_custom_name(func: &ItemFn) -> Option<String> {
    let attr = action_attr(func)?;
    if let Ok(lit) = attr.parse_args::<syn::LitStr>() {
        return Some(lit.value());
    }
    attr.parse_args::<syn::Ident>()
        .ok()
        .map(|ident| ident.to_string())
}

/// The input type name: the first typed argument that is not a `PrevState<T>`,
/// not a `Files`, and not the framework `logger`, mirroring the macro's
/// classification.
fn action_input_type(func: &ItemFn) -> Option<String> {
    func.sig.inputs.iter().find_map(|arg| {
        let FnArg::Typed(pat_type) = arg else {
            return None;
        };
        if prev_state_inner(&pat_type.ty).is_some()
            || is_files_type(&pat_type.ty)
            || is_logger_arg(pat_type)
        {
            return None;
        }
        type_name(&pat_type.ty)
    })
}

/// Whether a type is the framework `Files` collection (files are received on the
/// Rust side, not part of the TypeScript input type).
fn is_files_type(ty: &Type) -> bool {
    matches!(ty, Type::Path(path)
        if path.path.segments.last().is_some_and(|segment| segment.ident == "Files"))
}

fn action_prev_state_type(func: &ItemFn) -> Option<String> {
    func.sig.inputs.iter().find_map(|arg| {
        let FnArg::Typed(pat_type) = arg else {
            return None;
        };
        prev_state_inner(&pat_type.ty).as_ref().and_then(type_name)
    })
}

/// The success type: the `Ok` type of a `Result<T, E>` return, or the bare
/// return type name. Defaults to `unknown` for an opaque/absent return.
fn action_output_type(func: &ItemFn) -> String {
    let ReturnType::Type(_, ty) = &func.sig.output else {
        return "unknown".to_string();
    };
    if let Some(ok) = result_ok_type(ty) {
        return type_name(&ok).unwrap_or_else(|| "unknown".to_string());
    }
    type_name(ty).unwrap_or_else(|| "unknown".to_string())
}

fn is_logger_arg(pat_type: &syn::PatType) -> bool {
    matches!(&*pat_type.pat, syn::Pat::Ident(ident) if ident.ident == "logger")
}

/// The last path-segment identifier of a type (`ossido::Created` → `Created`).
fn type_name(ty: &Type) -> Option<String> {
    let Type::Path(type_path) = ty else {
        return None;
    };
    Some(type_path.path.segments.last()?.ident.to_string())
}

/// The inner `T` of a `PrevState<T>` type, if this is one.
fn prev_state_inner(ty: &Type) -> Option<Type> {
    single_generic_of(ty, "PrevState")
}

/// The `T` of a `Result<T, E>` return type, if this is a `Result`.
fn result_ok_type(ty: &Type) -> Option<Type> {
    single_generic_of(ty, "Result")
}

/// The first generic argument of `<Name><...>`, if the type's last segment is
/// `Name` with angle-bracketed arguments.
fn single_generic_of(ty: &Type, name: &str) -> Option<Type> {
    let Type::Path(type_path) = ty else {
        return None;
    };
    let segment = type_path.path.segments.last()?;
    if segment.ident != name {
        return None;
    }
    let PathArguments::AngleBracketed(args) = &segment.arguments else {
        return None;
    };
    match args.args.first()? {
        GenericArgument::Type(inner) => Some(inner.clone()),
        _ => None,
    }
}

/// Render `.ossido/actions.ts`: one typed, importable function per action,
/// built on the runtime `createAction` / `createStatefulAction` helpers from
/// `@ossido-labs/ossido/actions`.
pub fn render_actions_client(actions: &[ActionDef]) -> String {
    let mut ts = String::from(
        "// File automatically generated\n// Do not manually change it\n\n",
    );

    if actions.is_empty() {
        ts.push_str("export {}\n");
        return ts;
    }

    // Collect the distinct named types to import from the types module.
    let mut type_names: Vec<String> = Vec::new();
    let push_type = |name: &str, sink: &mut Vec<String>| {
        if name != "void" && name != "unknown" && !sink.iter().any(|existing| existing == name) {
            sink.push(name.to_string());
        }
    };
    for action in actions {
        if let Some(input) = &action.input {
            push_type(input, &mut type_names);
        }
        push_type(&action.output, &mut type_names);
        if let Some(prev) = &action.prev_state {
            push_type(prev, &mut type_names);
        }
    }
    type_names.sort();

    ts.push_str(
        "import { createAction, createStatefulAction } from \"@ossido-labs/ossido/actions\"\n",
    );
    if !type_names.is_empty() {
        ts.push_str(&format!(
            "import type {{ {} }} from \"@ossido-labs/ossido/types\"\n",
            type_names.join(", ")
        ));
    }
    ts.push('\n');

    for action in actions {
        let input = action.input.as_deref().unwrap_or("void");
        let output = &action.output;
        match &action.prev_state {
            Some(prev) => ts.push_str(&format!(
                "export const {name} = createStatefulAction<{input}, {output}, {prev}>(\"{url}\")\n",
                name = action.ts_name,
                url = action.url,
            )),
            None => ts.push_str(&format!(
                "export const {name} = createAction<{input}, {output}>(\"{url}\")\n",
                name = action.ts_name,
                url = action.url,
            )),
        }
    }

    ts
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_fn(src: &str) -> ItemFn {
        syn::parse_str(src).unwrap()
    }

    #[test]
    fn mangles_and_camel_cases() {
        assert_eq!(mangle("newsletter/actions"), "newsletter_actions");
        assert_eq!(mangle("actions"), "actions");
        assert_eq!(mangle("a/b.actions"), "a_b_actions");
        assert_eq!(to_camel_case("create_user"), "createUser");
        assert_eq!(to_camel_case("submit"), "submit");
    }

    #[test]
    fn recognises_actions_files_only() {
        assert!(is_actions_file(Path::new("/x/actions.rs")));
        assert!(is_actions_file(Path::new("/x/users.actions.rs")));
        assert!(!is_actions_file(Path::new("/x/reactions.rs")));
        assert!(!is_actions_file(Path::new("/x/page.rs")));
    }

    #[test]
    fn extracts_input_output_and_prev_state() {
        let simple = parse_fn(
            "#[action] async fn create_user(input: CreateUser, db: Db) -> Result<Created, ActionError> { todo!() }",
        );
        assert_eq!(action_input_type(&simple), Some("CreateUser".to_string()));
        assert_eq!(action_output_type(&simple), "Created");
        assert_eq!(action_prev_state_type(&simple), None);

        let stateful = parse_fn(
            "#[action] async fn submit(prev: PrevState<FormState>, form: Subscribe) -> FormState { todo!() }",
        );
        assert_eq!(action_input_type(&stateful), Some("Subscribe".to_string()));
        assert_eq!(action_output_type(&stateful), "FormState");
        assert_eq!(action_prev_state_type(&stateful), Some("FormState".to_string()));

        // logger is not treated as the input.
        let logged = parse_fn(
            "#[action] async fn ping(input: Ping, logger: Logger) -> Result<Pong, ActionError> { todo!() }",
        );
        assert_eq!(action_input_type(&logged), Some("Ping".to_string()));
    }

    #[test]
    fn reads_an_optional_custom_ts_name() {
        // No argument → default (camelCased at the call site).
        let default = parse_fn("#[action] async fn create_user(i: In) -> Out { todo!() }");
        assert_eq!(action_custom_name(&default), None);

        // Bare identifier.
        let ident = parse_fn("#[action(createUser)] async fn create_user(i: In) -> Out { todo!() }");
        assert_eq!(action_custom_name(&ident), Some("createUser".to_string()));

        // String literal (allows names an identifier can't spell).
        let lit = parse_fn("#[action(\"createUser\")] async fn create_user(i: In) -> Out { todo!() }");
        assert_eq!(action_custom_name(&lit), Some("createUser".to_string()));
    }

    #[test]
    fn renders_the_generated_client() {
        let actions = vec![
            ActionDef {
                fn_name: "create_user".to_string(),
                ts_name: "createUser".to_string(),
                module_key: "users_actions".to_string(),
                module_import: "__ossido_action_users_actions".to_string(),
                rel_path: "users/actions".to_string(),
                url: "/__ossido/action/users_actions/create_user".to_string(),
                input: Some("CreateUser".to_string()),
                output: "Created".to_string(),
                prev_state: None,
            },
            ActionDef {
                fn_name: "submit".to_string(),
                ts_name: "submit".to_string(),
                module_key: "newsletter_actions".to_string(),
                module_import: "__ossido_action_newsletter_actions".to_string(),
                rel_path: "newsletter/actions".to_string(),
                url: "/__ossido/action/newsletter_actions/submit".to_string(),
                input: Some("Subscribe".to_string()),
                output: "FormState".to_string(),
                prev_state: Some("FormState".to_string()),
            },
        ];
        let ts = render_actions_client(&actions);
        assert!(ts.contains(
            "import type { CreateUser, Created, FormState, Subscribe } from \"@ossido-labs/ossido/types\""
        ));
        assert!(ts.contains(
            "export const createUser = createAction<CreateUser, Created>(\"/__ossido/action/users_actions/create_user\")"
        ));
        assert!(ts.contains(
            "export const submit = createStatefulAction<Subscribe, FormState, FormState>(\"/__ossido/action/newsletter_actions/submit\")"
        ));

        // No actions → a valid empty module.
        assert!(render_actions_client(&[]).contains("export {}"));
    }
}
