use proc_macro2::TokenStream;
use quote::quote;
use syn::{Data, DeriveInput, Fields, Type, Visibility, parse_quote};

/// `#[ossido::Environment]` — mark the project's canonical environment schema.
///
/// The struct (conventionally named `Environment`) declares the environment
/// variables the app expects. Each field is read from the OS environment at
/// startup and parsed via [`FromStr`](core::str::FromStr):
/// - a non-`Option` field is **required** — a missing or unparseable value
///   panics at startup with the offending field/var name;
/// - an `Option<T>` field is optional (absent → `None`).
///
/// The env-var name is the field name upper-snake-cased (`api_url` → `API_URL`).
///
/// A field marked `#[public]` is additionally exposed to the frontend: the macro
/// serializes the public subset to JSON (`__ossido_public_env_json`), which the
/// generated `main.rs` registers with the runtime so it can be injected into the
/// SSR global that powers `getEnv` on the client. The `#[public]` helper
/// attribute is inert — it is read and stripped here so the compiler never sees
/// it.
///
/// Rust code reads any field (public or private) through the `ossido::get_env!`
/// macro, which resolves to the parsed singleton the generated `main.rs` builds.
pub fn environment_attr(_args: TokenStream, item: TokenStream) -> TokenStream {
    let mut input = match syn::parse2::<DeriveInput>(item) {
        Ok(input) => input,
        Err(err) => return err.to_compile_error(),
    };

    let Data::Struct(data) = &mut input.data else {
        return syn::Error::new_spanned(
            &input,
            "#[ossido::Environment] can only be applied to a struct",
        )
        .to_compile_error();
    };

    let Fields::Named(fields) = &mut data.fields else {
        return syn::Error::new_spanned(
            &input,
            "#[ossido::Environment] requires a struct with named fields",
        )
        .to_compile_error();
    };

    // Per field: build the `from_env` initializer and, for `#[public]` fields,
    // the JSON-map insertion. `#[public]` is stripped from the re-emitted struct.
    let mut from_env_inits = Vec::new();
    let mut public_inserts = Vec::new();

    for field in fields.named.iter_mut() {
        let ident = field
            .ident
            .clone()
            .expect("named field always has an ident");
        let field_name = ident.to_string();
        let env_var = field_name.to_uppercase();

        let is_public = field
            .attrs
            .iter()
            .any(|attr| attr.path().is_ident("public"));
        // Strip the inert `#[public]` helper so the compiler never sees it.
        field.attrs.retain(|attr| !attr.path().is_ident("public"));

        // The struct is a framework-managed global read across modules (the
        // generated `main.rs` accessor and `get_env!` in user modules), so every
        // field must be publicly visible regardless of how the user declared it.
        field.vis = Visibility::Public(parse_quote!(pub));

        let missing_msg = format!(
            "Ossido: missing required environment variable `{env_var}` (field `{field_name}`)"
        );
        let invalid_msg = format!(
            "Ossido: environment variable `{env_var}` (field `{field_name}`) has an invalid value"
        );

        if is_option(&field.ty) {
            from_env_inits.push(quote! {
                #ident: match ::std::env::var(#env_var) {
                    ::core::result::Result::Ok(__value) => ::core::option::Option::Some(
                        __value.parse().unwrap_or_else(|_| ::core::panic!(#invalid_msg))
                    ),
                    ::core::result::Result::Err(_) => ::core::option::Option::None,
                },
            });
        } else {
            from_env_inits.push(quote! {
                #ident: ::std::env::var(#env_var)
                    .unwrap_or_else(|_| ::core::panic!(#missing_msg))
                    .parse()
                    .unwrap_or_else(|_| ::core::panic!(#invalid_msg)),
            });
        }

        if is_public {
            public_inserts.push(quote! {
                __map.insert(
                    ::std::string::String::from(#field_name),
                    ossido::serde_json::to_value(&self.#ident)
                        .expect("Ossido: failed to serialize public environment field"),
                );
            });
        }
    }

    // Also public at the type level so the generated `main.rs` (crate root) can
    // name it in the singleton accessor's return type.
    input.vis = Visibility::Public(parse_quote!(pub));

    let name = &input.ident;

    quote! {
        #[derive(ossido::serde::Serialize, ossido::serde::Deserialize)]
        #[serde(crate = "ossido::serde")]
        // Env vars are conventionally SCREAMING_SNAKE_CASE, so allow fields to be
        // named to match (e.g. `API_URL: String`) without a `non_snake_case`
        // warning. snake_case fields still work — the var name is derived by
        // upper-casing either way.
        #[allow(non_snake_case)]
        #input

        impl #name {
            /// Read and parse every field from the OS environment. Panics on a
            /// missing/invalid required (non-`Option`) variable.
            pub fn from_env() -> Self {
                Self {
                    #(#from_env_inits)*
                }
            }

            /// JSON object of only the public fields — registered with the
            /// runtime by the generated `main.rs` and injected into the SSR
            /// global consumed by the frontend `getEnv`.
            #[doc(hidden)]
            pub fn __ossido_public_env_json(&self) -> ::std::string::String {
                let mut __map = ossido::serde_json::Map::new();
                #(#public_inserts)*
                ossido::serde_json::Value::Object(__map).to_string()
            }
        }
    }
}

/// Whether a type is `Option<..>` (matched by the last path segment's ident, so
/// `std::option::Option<T>` and a bare `Option<T>` both count).
fn is_option(ty: &Type) -> bool {
    if let Type::Path(type_path) = ty
        && let Some(segment) = type_path.path.segments.last()
    {
        return segment.ident == "Option";
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    fn expand(item: TokenStream) -> String {
        environment_attr(TokenStream::new(), item)
            .to_string()
            .replace(' ', "")
    }

    #[test]
    fn injects_serde_derives_and_from_env() {
        let out = expand(quote! {
            struct Environment {
                api_url: String,
                port: u16,
            }
        });
        assert!(out.contains("ossido::serde::Serialize"));
        assert!(out.contains("ossido::serde::Deserialize"));
        assert!(out.contains("fnfrom_env"));
        // Required field reads the upper-snake-cased var name.
        assert!(out.contains("\"API_URL\""));
        assert!(out.contains("\"PORT\""));
    }

    #[test]
    fn strips_public_attribute_and_collects_public_json() {
        let out = expand(quote! {
            struct Environment {
                #[public]
                api_url: String,
                database_url: String,
            }
        });
        // The inert `#[public]` helper must not survive into the output.
        assert!(!out.contains("#[public]"));
        // Public field is inserted into the JSON map; private one is not.
        assert!(out.contains("__ossido_public_env_json"));
        assert!(out.contains("\"api_url\""));
        assert!(!out.contains("\"database_url\""));
    }

    #[test]
    fn allows_screaming_snake_case_field_names() {
        let out = expand(quote! {
            struct Environment {
                API_URL: String,
            }
        });
        // The re-emitted struct is `#[allow(non_snake_case)]` so users can name
        // fields to match the env var directly.
        assert!(out.contains("#[allow(non_snake_case)]"));
        // The var name is the upper-cased field — already screaming here.
        assert!(out.contains("\"API_URL\""));
    }

    #[test]
    fn optional_fields_become_none_when_absent() {
        let out = expand(quote! {
            struct Environment {
                debug: Option<bool>,
            }
        });
        assert!(out.contains("Option::None"));
        assert!(out.contains("Option::Some"));
    }

    #[test]
    fn rejects_non_struct() {
        let out = expand(quote! {
            enum Environment { A, B }
        });
        assert!(out.contains("compile_error!"));
    }
}
