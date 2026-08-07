use quote::quote;
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{FnArg, Pat, Stmt, parse_quote, parse2};

/// Whether a handler parameter is the framework `logger` (matched by the name
/// `logger`, so it is provided automatically rather than read from state).
pub fn is_logger_pat(pat: &Pat) -> bool {
    matches!(pat, Pat::Ident(pat_ident) if pat_ident.ident == "logger")
}

pub fn create_struct_fn_arg() -> FnArg {
    parse2(quote! {
        ossido_lib::axum::extract::State(state): ossido_lib::axum::extract::State<ApplicationState>
    })
    .unwrap()
}

pub fn import_main_application_state(argument_names: Punctuated<Pat, Comma>) -> Option<Stmt> {
    if !argument_names.is_empty() {
        let local: Stmt = parse_quote!(
            use crate::ossido_main_state::ApplicationState;
        );
        return Some(local);
    }

    None
}

pub fn crate_application_state_extractor(argument_names: Punctuated<Pat, Comma>) -> Option<Stmt> {
    if !argument_names.is_empty() {
        let use_item: Stmt = parse_quote!(let ApplicationState { #argument_names, .. } = state;);
        return Some(use_item);
    }

    None
}

pub fn params_argument() -> FnArg {
    parse2(quote! {
        ossido_lib::axum::extract::Path(params): ossido_lib::axum::extract::Path<
            std::collections::HashMap<String, String>
        >
    })
    .unwrap()
}

pub fn request_argument() -> FnArg {
    parse2(quote! {
            request: ossido_lib::axum::extract::Request
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
        assert!(import_main_application_state(args(&[])).is_none());
        assert!(crate_application_state_extractor(args(&[])).is_none());
    }

    #[test]
    fn import_main_application_state_emits_the_use_when_state_is_used() {
        let stmt = import_main_application_state(args(&["db"])).expect("a use statement");
        assert_eq!(norm(&stmt), "usecrate::ossido_main_state::ApplicationState;");
    }

    #[test]
    fn state_extractor_destructures_the_declared_fields() {
        let stmt = crate_application_state_extractor(args(&["db", "user"])).expect("a statement");
        assert_eq!(norm(&stmt), "letApplicationState{db,user,..}=state;");
    }

    #[test]
    fn axum_argument_helpers_produce_the_expected_extractors() {
        assert!(norm(create_struct_fn_arg()).contains("State(state)"));
        assert!(norm(create_struct_fn_arg()).contains("State<ApplicationState>"));

        let params = norm(params_argument());
        assert!(params.contains("Path(params)"));
        assert!(params.contains("HashMap<String,String>"));

        assert_eq!(
            norm(request_argument()),
            "request:ossido_lib::axum::extract::Request"
        );
    }
}
