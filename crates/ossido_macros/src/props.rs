use proc_macro2::TokenStream;
use quote::quote;
use syn::{DeriveInput, Item};

/// The `serde` derives (and crate-path pin) that `#[Type]` / `#[Props]` inject.
///
/// The path goes through `ossido`'s own re-export (`ossido::serde`) and pins it
/// with `#[serde(crate = ...)]`, so user code gets `Serialize`/`Deserialize` for
/// free without needing a direct `serde` dependency of its own.
fn serde_derives() -> TokenStream {
    quote! {
        #[derive(ossido::serde::Serialize, ossido::serde::Deserialize)]
        #[serde(crate = "ossido::serde")]
    }
}

/// `#[ossido::Type]` — bundle `serde::{Serialize, Deserialize}` onto a struct or
/// enum and register it for TypeScript generation (the type is exported from the
/// `"ossido/types"` module). Replaces the old `#[derive(Serialize, Deserialize,
/// Type)]`.
///
/// TypeScript generation detects the `#[Type]` attribute by parsing the source
/// (see `ossido_cli`'s `has_derive_type`), so the expansion only needs to add the
/// serde derives. A `type` alias can't derive anything, so it is passed through
/// unchanged (still detected by source parsing).
pub fn type_attr(_args: TokenStream, item: TokenStream) -> TokenStream {
    let parsed = match syn::parse2::<Item>(item) {
        Ok(item) => item,
        Err(err) => return err.to_compile_error(),
    };

    match parsed {
        Item::Struct(_) | Item::Enum(_) => {
            let derives = serde_derives();
            quote! {
                #derives
                #parsed
            }
        }
        // Type aliases (and anything else) can't carry derives — pass through.
        other => quote! { #other },
    }
}

/// `#[ossido::Props]` — everything `#[Type]` does (serde derives + TypeScript
/// generation), plus a `From<Self> for ossido::Response` impl so the struct can
/// be returned directly from a `#[ossido::handler]` instead of being wrapped in
/// `Response::Props(Props::new(..))`.
///
/// ```ignore
/// #[ossido::Props]
/// struct HomeProps { subtitle: String }
///
/// #[ossido::handler]
/// async fn home(_req: Request) -> HomeProps {
///     HomeProps { subtitle: "hello".into() }
/// }
/// ```
pub fn props_attr(_args: TokenStream, item: TokenStream) -> TokenStream {
    let input = match syn::parse2::<DeriveInput>(item) {
        Ok(input) => input,
        Err(err) => return err.to_compile_error(),
    };
    let name = &input.ident;
    let (impl_generics, ty_generics, where_clause) = input.generics.split_for_impl();
    let derives = serde_derives();

    quote! {
        #derives
        #input

        impl #impl_generics ::core::convert::From<#name #ty_generics>
            for ossido::Response #where_clause
        {
            fn from(value: #name #ty_generics) -> Self {
                ossido::Response::Props(ossido::Props::new(value))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn expand_props(item: TokenStream) -> String {
        props_attr(TokenStream::new(), item)
            .to_string()
            .replace(' ', "")
    }

    fn expand_type(item: TokenStream) -> String {
        type_attr(TokenStream::new(), item)
            .to_string()
            .replace(' ', "")
    }

    #[test]
    fn type_injects_serde_derives_onto_a_struct() {
        let out = expand_type(quote! {
            struct Foo { subtitle: String }
        });
        assert!(out.contains("ossido::serde::Serialize"));
        assert!(out.contains("ossido::serde::Deserialize"));
        assert!(out.contains("#[serde(crate=\"ossido::serde\")]"));
        // The item itself is re-emitted.
        assert!(out.contains("structFoo"));
    }

    #[test]
    fn type_passes_type_aliases_through_untouched() {
        let out = expand_type(quote! {
            type Foo = i32;
        });
        assert!(out.contains("typeFoo=i32"));
        // No serde derives on an alias (it can't carry them).
        assert!(!out.contains("Serialize"));
    }

    #[test]
    fn props_adds_serde_and_a_from_impl_into_a_response() {
        let out = expand_props(quote! {
            struct HomeProps { subtitle: String }
        });
        assert!(out.contains("ossido::serde::Serialize"));
        assert!(out.contains("ossido::serde::Deserialize"));
        assert!(out.contains("::core::convert::From<HomeProps>forossido::Response"));
        assert!(out.contains("ossido::Response::Props(ossido::Props::new(value))"));
    }

    #[test]
    fn props_carries_generics_and_where_clauses_onto_the_impl() {
        let out = expand_props(quote! {
            struct Wrapper<T> where T: Clone { inner: T }
        });
        assert!(out.contains("impl<T>"));
        assert!(out.contains("From<Wrapper<T>>"));
        assert!(out.contains("whereT:Clone"));
    }

    #[test]
    fn invalid_input_becomes_a_compile_error() {
        let out = expand_props(quote! { 1 + 1 });
        assert!(out.contains("compile_error!"));
    }
}
