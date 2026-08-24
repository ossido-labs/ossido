use quote::quote;
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{FnArg, Pat, Stmt, parse_quote, parse2};

/// Whether a handler parameter is the framework `logger` (matched by the name
/// `logger`, so it is provided automatically rather than read from state).
pub fn is_logger_pat(pat: &Pat) -> bool {
    matches!(pat, Pat::Ident(pat_ident) if pat_ident.ident == "logger")
}

// `ApplicationState` is referenced by full path (never via a generated `use`):
// a file with several state-using handlers/actions would otherwise emit the
// same import more than once (E0252).
pub fn create_struct_fn_arg() -> FnArg {
    parse2(quote! {
        ossido::axum::extract::State(state):
            ossido::axum::extract::State<crate::ossido_main_state::ApplicationState>
    })
    .unwrap()
}

pub fn crate_application_state_extractor(argument_names: Punctuated<Pat, Comma>) -> Option<Stmt> {
    if !argument_names.is_empty() {
        let use_item: Stmt = parse_quote!(
            let crate::ossido_main_state::ApplicationState { #argument_names, .. } = state;
        );
        return Some(use_item);
    }

    None
}

pub fn params_argument() -> FnArg {
    parse2(quote! {
        ossido::axum::extract::Path(params): ossido::axum::extract::Path<
            std::collections::HashMap<String, String>
        >
    })
    .unwrap()
}

pub fn request_argument() -> FnArg {
    parse2(quote! {
            request: ossido::axum::extract::Request
    })
    .unwrap()
}

#[cfg(test)]
mod tests {
    use quote::ToTokens;
    use syn::parse_quote;

    use super::*;

    /// Render any `ToTokens` value whitespace-free for stable substring asserts.
    fn norm(tokens: impl ToTokens) -> String {
        tokens.to_token_stream().to_string().replace(' ', "")
    }

    fn args(names: &[&str]) -> Punctuated<Pat, Comma> {
        let mut out: Punctuated<Pat, Comma> = Punctuated::new();
        for name in names {
            let ident = syn::Ident::new(name, proc_macro2::Span::call_site());
            out.push(parse_quote!(#ident));
        }
        out
    }

    #[test]
    fn is_logger_pat_matches_only_the_logger_binding() {
        let logger: Pat = parse_quote!(logger);
        let other: Pat = parse_quote!(db);
        assert!(is_logger_pat(&logger));
        assert!(!is_logger_pat(&other));
    }

    #[test]
    fn state_helpers_are_none_without_state_fields() {
        assert!(crate_application_state_extractor(args(&[])).is_none());
    }

    #[test]
    fn state_extractor_destructures_the_declared_fields() {
        let stmt = crate_application_state_extractor(args(&["db", "user"])).expect("a statement");
        assert_eq!(
            norm(&stmt),
            "letcrate::ossido_main_state::ApplicationState{db,user,..}=state;"
        );
    }

    #[test]
    fn axum_argument_helpers_produce_the_expected_extractors() {
        assert!(norm(create_struct_fn_arg()).contains("State(state)"));
        assert!(
            norm(create_struct_fn_arg())
                .contains("State<crate::ossido_main_state::ApplicationState>")
        );

        let params = norm(params_argument());
        assert!(params.contains("Path(params)"));
        assert!(params.contains("HashMap<String,String>"));

        assert_eq!(
            norm(request_argument()),
            "request:ossido::axum::extract::Request"
        );
    }
}
