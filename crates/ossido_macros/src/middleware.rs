use proc_macro2::TokenStream;
use quote::quote;
use syn::ItemFn;

pub fn middleware_core(_args: TokenStream, item: TokenStream) -> TokenStream {
    let item = match syn::parse2::<ItemFn>(item) {
        Ok(item) => item,
        Err(err) => return err.to_compile_error(),
    };
    quote! {
          #item
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn expand(item: TokenStream) -> String {
        middleware_core(TokenStream::new(), item)
            .to_string()
            .replace(' ', "")
    }

    #[test]
    fn passes_the_function_through_unchanged() {
        let out = expand(quote! {
            async fn auth(req: Request) -> Response { todo!() }
        });
        assert!(out.contains("asyncfnauth(req:Request)->Response"));
    }

    #[test]
    fn invalid_input_becomes_a_compile_error() {
        let out = expand(quote! { struct NotAFunction; });
        assert!(out.contains("compile_error!"));
    }
}
