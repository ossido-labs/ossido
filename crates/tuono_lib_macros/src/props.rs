use proc_macro2::TokenStream;
use quote::quote;
use syn::DeriveInput;

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
    let input = match syn::parse2::<DeriveInput>(item) {
        Ok(input) => input,
        Err(err) => return err.to_compile_error(),
    };
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
}

#[cfg(test)]
mod tests {
    use super::*;

    fn expand(item: TokenStream) -> String {
        derive_props_core(item).to_string().replace(' ', "")
    }

    #[test]
    fn derives_a_from_impl_into_a_props_response() {
        let out = expand(quote! {
            struct HomeProps { subtitle: String }
        });
        assert!(out.contains("::core::convert::From<HomeProps>fortuono_lib::Response"));
        assert!(out.contains("tuono_lib::Response::Props(tuono_lib::Props::new(value))"));
    }

    #[test]
    fn carries_generics_and_where_clauses_onto_the_impl() {
        let out = expand(quote! {
            struct Wrapper<T> where T: Clone { inner: T }
        });
        // The generic parameter and bound are threaded through the impl.
        assert!(out.contains("impl<T>"));
        assert!(out.contains("From<Wrapper<T>>"));
        assert!(out.contains("whereT:Clone"));
    }

    #[test]
    fn invalid_input_becomes_a_compile_error() {
        // `parse2::<DeriveInput>` rejects a bare expression.
        let out = expand(quote! { 1 + 1 });
        assert!(out.contains("compile_error!"));
    }
}
