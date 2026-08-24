use std::str::FromStr;

use convert_case::{Case, Casing};
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{GenericArgument, GenericParam, PathArguments};

fn builtin_to_typescript(type_name: &str) -> Option<&'static str> {
    match type_name {
        "i8" | "i16" | "i32" | "i64" | "i128" | "u8" | "u16" | "u32" | "u64" | "f32" | "f64"
        | "isize" | "usize" => Some("number"),
        "str" | "String" | "char" => Some("string"),
        "bool" => Some("boolean"),
        _ => None,
    }
}

pub fn get_field_name(field: &syn::Field) -> String {
    let field_name: String = parse_serde_attribute(&field.attrs, "rename");

    if !field_name.is_empty() {
        return field_name;
    }

    if let Some(field) = field.ident.as_ref() {
        field.to_string()
    } else {
        String::from("unknown")
    }
}

/// Parse the struct generics and return them collected into a "<...>" string.
/// If no generics are present, return an empty string.
pub fn parse_generics_to_typescript_string(generics: Punctuated<GenericParam, Comma>) -> String {
    let generics = generics
        .iter()
        .map(|param| {
            if let syn::GenericParam::Type(type_param) = param {
                type_param.ident.to_string()
            } else {
                String::new()
            }
        })
        .filter(|name| !name.is_empty())
        .collect::<Vec<String>>();

    if !generics.is_empty() {
        return format!("<{}>", generics.join(", "));
    }

    String::new()
}

/// Parse any "assign" `#[serde(... = "...")]` attribute and return the value of the specified
/// attribute.
pub fn parse_serde_attribute<T>(attrs: &[syn::Attribute], attribute_name: &str) -> T
where
    T: Default + FromStr,
{
    for attr in attrs {
        if attr.path().is_ident("serde")
            && let Ok(meta) = attr.parse_args::<syn::Expr>()
        {
            match meta {
                syn::Expr::Assign(assign) => {
                    if let syn::Expr::Path(path) = *assign.left
                        && !path.path.is_ident(attribute_name)
                    {
                        return T::default();
                    }
                    if let syn::Expr::Lit(syn::ExprLit {
                        lit: syn::Lit::Str(lit_str),
                        ..
                    }) = *assign.right
                    {
                        return T::from_str(&lit_str.value()).unwrap_or_default();
                    }
                }
                _ => return T::default(),
            }
        }
    }
    T::default()
}

/// Check if the element should be skipped based on the presence of
/// `#[serde(skip)]` or `#[serde(skip_serializing)]` attributes.
pub fn should_skip_element(attrs: &[syn::Attribute]) -> bool {
    for attr in attrs {
        if attr.path().is_ident("serde")
            && let Ok(meta) = attr.parse_args::<syn::Ident>()
            && (meta == "skip" || meta == "skip_serializing")
        {
            return true;
        }
    }
    false
}

pub fn rust_to_typescript_type(ty: &syn::Type) -> String {
    rust_to_typescript_type_with(ty, &|name| name.to_string())
}

/// Like [`rust_to_typescript_type`], but with a caller-chosen rendering for
/// named (non-builtin) leaf types: the schema generator emits bare names (the
/// types are declared in the same generated module), while the API-route
/// generator emits `import(…)`-qualified references.
pub fn rust_to_typescript_type_with(ty: &syn::Type, named: &dyn Fn(&str) -> String) -> String {
    match ty {
        syn::Type::Tuple(tuple) => {
            let inner_types: Vec<String> = tuple
                .elems
                .iter()
                .map(|elem| rust_to_typescript_type_with(elem, named))
                .collect();
            format!("[{}]", inner_types.join(", "))
        }
        syn::Type::Path(type_path) => {
            if let Some(last_segment) = type_path.path.segments.last() {
                let outer_type = last_segment.ident.to_string();
                if let PathArguments::AngleBracketed(args) = &last_segment.arguments {
                    // Recurse so nested containers map structurally
                    // (`Option<Vec<Todo>>` → `Todo[] | null`, not `Vec | null`).
                    let inner_types: Vec<String> = args
                        .args
                        .iter()
                        .filter_map(|arg| {
                            if let GenericArgument::Type(inner_type) = arg {
                                Some(rust_to_typescript_type_with(inner_type, named))
                            } else {
                                None
                            }
                        })
                        .collect();
                    let first = || inner_types.first().map(String::as_str).unwrap_or("unknown");

                    match outer_type.as_str() {
                        "Option" => {
                            format!("{} | null", first())
                        }
                        "Vec" => {
                            let inner = first();
                            // `T[]` binds tighter than unions — a compound inner
                            // type needs the `Array<…>` form.
                            if inner.chars().all(|c| c.is_alphanumeric() || c == '_') {
                                format!("{inner}[]")
                            } else {
                                format!("Array<{inner}>")
                            }
                        }
                        "HashMap" | "BTreeMap" => {
                            format!(
                                "Record<{}, {}>",
                                first(),
                                inner_types.get(1).map(String::as_str).unwrap_or("unknown")
                            )
                        }
                        _ => "unknown".to_string(),
                    }
                } else {
                    builtin_to_typescript(&outer_type)
                        .map(str::to_string)
                        .unwrap_or_else(|| named(&outer_type))
                }
            } else {
                "unknown".to_string()
            }
        }
        syn::Type::Reference(reference) => {
            // Ignore lifetimes and treat references as their base type
            rust_to_typescript_type_with(&reference.elem, named)
        }
        _ => "unknown".to_string(),
    }
}

// This enum matches serde's RenameRule enum
#[derive(Debug, Eq, PartialEq, Default)]
pub enum RenameSerdeOptions {
    #[default]
    None,
    LowerCase,
    UpperCase,
    PascalCase,
    CamelCase,
    SnakeCase,
    ScreamingSnakeCase,
    KebabCase,
    ScreamingKebabCase,
}

impl FromStr for RenameSerdeOptions {
    type Err = ();

    fn from_str(input: &str) -> Result<Self, Self::Err> {
        match input {
            "lowercase" => Ok(Self::LowerCase),
            "UPPERCASE" => Ok(Self::UpperCase),
            "PascalCase" => Ok(Self::PascalCase),
            "camelCase" => Ok(Self::CamelCase),
            "snake_case" => Ok(Self::SnakeCase),
            "SCREAMING_SNAKE_CASE" => Ok(Self::ScreamingSnakeCase),
            "kebab-case" => Ok(Self::KebabCase),
            "SCREAMING-KEBAB-CASE" => Ok(Self::ScreamingKebabCase),
            _ => Err(()),
        }
    }
}

impl RenameSerdeOptions {
    pub fn transform(&self, input: String) -> String {
        match self {
            Self::LowerCase => input.to_lowercase(),
            Self::UpperCase => input.to_uppercase(),
            Self::CamelCase => input.to_case(Case::Camel),
            Self::PascalCase => input.to_case(Case::Pascal),
            _ => input,
        }
    }
}
