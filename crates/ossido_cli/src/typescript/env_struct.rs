use std::path::{Path, PathBuf};

use glob::glob;
use syn::{Item, ItemStruct};

use crate::symbols::ENVIRONMENT_TRAIT;
use crate::typescript::parser::utils::rust_to_typescript_type;

/// A public field of the project's `#[ossido::Environment]` struct: the field
/// name (used verbatim as the key in both the generated TS type and the runtime
/// JSON) and its TypeScript type.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EnvField {
    pub name: String,
    pub ts_type: String,
}

/// The project's discovered `#[ossido::Environment]` struct. Drives both the
/// generated `@ossido-labs/ossido/env` TypeScript types (public fields only) and
/// the `main.rs` wiring (the file to `#[path]`-include + the struct name to build
/// the singleton from).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EnvStruct {
    /// Absolute path to the Rust file declaring the struct.
    pub file_path: PathBuf,
    /// The struct's identifier (conventionally `Environment`).
    pub struct_name: String,
    /// The `#[public]` fields — the only ones exposed to the frontend.
    pub public_fields: Vec<EnvField>,
}

/// Find the project's `#[ossido::Environment]` struct, if any. Scans `src/**/*.rs`
/// (cheap `contains` pre-filter), returning the first match. `None` keeps the
/// whole feature inert — no env types, no env global.
pub fn collect_environment(base_path: &Path) -> Option<EnvStruct> {
    let pattern = base_path.join("src/**/*.rs").to_str().map(str::to_string)?;
    let entries = glob(&pattern).ok()?;

    for entry in entries.flatten() {
        let Ok(source) = std::fs::read_to_string(&entry) else {
            continue;
        };
        // Cheap filter before invoking the parser.
        if !source.contains(*ENVIRONMENT_TRAIT) {
            continue;
        }
        let Ok(parsed) = syn::parse_file(&source) else {
            continue;
        };

        for item in parsed.items {
            if let Item::Struct(item_struct) = item
                && has_environment_attr(&item_struct)
            {
                return Some(EnvStruct {
                    file_path: entry.clone(),
                    struct_name: item_struct.ident.to_string(),
                    public_fields: public_fields(&item_struct),
                });
            }
        }
    }

    None
}

/// Whether a struct carries the `#[Environment]` / `#[ossido::Environment]`
/// attribute macro (matched on the attribute path's last segment).
fn has_environment_attr(item_struct: &ItemStruct) -> bool {
    item_struct.attrs.iter().any(|attr| {
        attr.path()
            .segments
            .last()
            .is_some_and(|segment| segment.ident == ENVIRONMENT_TRAIT)
    })
}

/// The `#[public]` fields of the struct, mapped to their TypeScript types. The
/// field name is used verbatim (no serde renaming) so it matches the key emitted
/// at runtime by `Environment::__ossido_public_env_json`.
fn public_fields(item_struct: &ItemStruct) -> Vec<EnvField> {
    item_struct
        .fields
        .iter()
        .filter(|field| {
            field
                .attrs
                .iter()
                .any(|attr| attr.path().is_ident("public"))
        })
        .filter_map(|field| {
            let name = field.ident.as_ref()?.to_string();
            Some(EnvField {
                name,
                ts_type: rust_to_typescript_type(&field.ty),
            })
        })
        .collect()
}

/// Render the public env fields as an augmentation of `@ossido-labs/ossido/env`'s
/// `Register` interface. Emitted only when an `Environment` struct exists, so the
/// feature stays fully optional.
///
/// ```ts
/// declare module "@ossido-labs/ossido/env" {
///   interface Register {
///     env: {
///       api_url: string
///       port: number
///     }
///   }
/// }
/// ```
pub fn render_env_module(env: &EnvStruct) -> String {
    let mut ts = String::from(
        "declare module \"@ossido-labs/ossido/env\" {\n  interface Register {\n    env: {\n",
    );
    for EnvField { name, ts_type } in &env.public_fields {
        ts.push_str(&format!("      {name}: {ts_type}\n"));
    }
    ts.push_str("    }\n  }\n}\n");
    ts
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(struct_src: &str) -> ItemStruct {
        syn::parse_str(struct_src).unwrap()
    }

    #[test]
    fn detects_the_environment_attribute() {
        let attr = parse("#[ossido::Environment] struct Environment { a: String }");
        assert!(has_environment_attr(&attr));

        let bare = parse("#[Environment] struct Environment { a: String }");
        assert!(has_environment_attr(&bare));

        let plain = parse("struct NotEnv { a: String }");
        assert!(!has_environment_attr(&plain));
    }

    #[test]
    fn collects_only_public_fields_with_mapped_types() {
        let item = parse(
            r#"
            #[ossido::Environment]
            struct Environment {
                #[public]
                api_url: String,
                #[public]
                port: u16,
                database_url: String,
                #[public]
                debug: Option<bool>,
            }
            "#,
        );
        let fields = public_fields(&item);
        assert_eq!(
            fields,
            vec![
                EnvField {
                    name: "api_url".to_string(),
                    ts_type: "string".to_string()
                },
                EnvField {
                    name: "port".to_string(),
                    ts_type: "number".to_string()
                },
                EnvField {
                    name: "debug".to_string(),
                    ts_type: "boolean | null".to_string()
                },
            ]
        );
    }

    #[test]
    fn renders_the_register_augmentation() {
        let env = EnvStruct {
            file_path: PathBuf::from("src/env.rs"),
            struct_name: "Environment".to_string(),
            public_fields: vec![
                EnvField {
                    name: "api_url".to_string(),
                    ts_type: "string".to_string(),
                },
                EnvField {
                    name: "port".to_string(),
                    ts_type: "number".to_string(),
                },
            ],
        };
        let ts = render_env_module(&env);
        assert!(ts.contains("declare module \"@ossido-labs/ossido/env\""));
        assert!(ts.contains("api_url: string"));
        assert!(ts.contains("port: number"));
    }
}
