use proc_macro::TokenStream;
use quote::quote;
use syn::{DeriveInput, parse_macro_input};

/// Derive `From<Self> for tuono_lib::Response`, so a struct can be returned
/// directly from a `#[tuono_lib::handler]` instead of wrapping it in
/// `Response::Props(Props::new(..))`.
///
/// ```ignore
/// #[derive(serde::Serialize, tuono_lib::Props)]
/// struct HomeProps { subtitle: String }
///
/// #[tuono_lib::handler]
/// async fn home(_req: Request) -> HomeProps {
///     HomeProps { subtitle: "hello".into() }
/// }
/// ```
pub fn derive_props_core(item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as DeriveInput);
    let name = &input.ident;
    let (impl_generics, ty_generics, where_clause) = input.generics.split_for_impl();

    quote! {
        impl #impl_generics ::core::convert::From<#name #ty_generics>
            for tuono_lib::Response #where_clause
        {
            fn from(value: #name #ty_generics) -> Self {
                tuono_lib::Response::Props(tuono_lib::Props::new(value))
            }
        }
    }
    .into()
}
