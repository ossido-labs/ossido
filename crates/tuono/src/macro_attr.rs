//! Shared detection for Tuono's attribute macros in user source files.
//!
//! The CLI statically analyses route files (before they are compiled) to build
//! the router, so it must recognise the attribute macros in both the imported
//! form (`#[handler]`) and the fully-qualified form (`#[tuono_lib::handler]`).
//! Centralising the match here keeps every detector consistent and spelling-
//! agnostic.

use syn::Path;

/// Whether `path` names the Tuono attribute macro `name`, in either the imported
/// form (`#[name]`) or the fully-qualified `#[tuono_lib::name]`.
pub fn is_tuono_attr(path: &Path, name: &str) -> bool {
    let segments: Vec<&syn::Ident> = path.segments.iter().map(|segment| &segment.ident).collect();
    match segments.as_slice() {
        [only] => *only == name,
        [krate, attr] => *krate == "tuono_lib" && *attr == name,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use syn::parse_quote;

    use super::*;

    #[test]
    fn matches_imported_and_fully_qualified_forms() {
        let imported: Path = parse_quote!(handler);
        let qualified: Path = parse_quote!(tuono_lib::handler);
        assert!(is_tuono_attr(&imported, "handler"));
        assert!(is_tuono_attr(&qualified, "handler"));
    }

    #[test]
    fn rejects_other_names_crates_and_shapes() {
        // Wrong macro name.
        let other: Path = parse_quote!(middleware);
        assert!(!is_tuono_attr(&other, "handler"));
        // Right name, wrong crate.
        let wrong_crate: Path = parse_quote!(other_crate::handler);
        assert!(!is_tuono_attr(&wrong_crate, "handler"));
        // Too many segments.
        let deep: Path = parse_quote!(a::tuono_lib::handler);
        assert!(!is_tuono_attr(&deep, "handler"));
    }
}
