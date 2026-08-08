use syn::{Attribute, Meta};

use crate::symbols::{PROPS_TRAIT, TYPE_TRAIT};

/// Whether a struct/enum should have a TypeScript type generated for it — i.e.
/// it carries the `#[Type]` or `#[Props]` attribute macro (`Props` implies
/// `Type`). The legacy `#[derive(Type)]` / `#[derive(Props)]` derive form is
/// still recognised so pre-attribute sources keep generating.
pub fn has_derive_type(attrs: &[Attribute]) -> bool {
    for attr in attrs {
        // Attribute-macro form: `#[Type]`, `#[ossido::Type]`, `#[Props]`, ...
        // The macro's path (last segment) is the marker; `derive`/`serde`/`doc`
        // and friends fall through to the legacy check below.
        if let Some(segment) = attr.path().segments.last()
            && (segment.ident == TYPE_TRAIT || segment.ident == PROPS_TRAIT)
        {
            return true;
        }

        // Legacy derive form: `#[derive(.., Type, ..)]` / `#[derive(.., Props, ..)]`.
        if let Meta::List(meta_list) = &attr.meta
            && meta_list.path.is_ident("derive")
        {
            for nested_meta in meta_list
                .parse_args_with(
                    syn::punctuated::Punctuated::<Meta, syn::Token![,]>::parse_terminated,
                )
                .unwrap_or_default()
            {
                if let Meta::Path(path) = nested_meta
                    && (path.is_ident(&TYPE_TRAIT) || path.is_ident(&PROPS_TRAIT))
                {
                    return true;
                }
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {

    use syn::{ItemEnum, ItemStruct, ItemType, parse_quote};

    use super::*;

    #[test]
    fn it_correctly_checks_if_derive_type_is_present() {
        let test_struct: ItemStruct = parse_quote! {
            #[derive(Type)]
            struct MyStruct;
        };

        assert!(has_derive_type(&test_struct.attrs));

        let test_type: ItemType = parse_quote! {
            #[derive(Type)]
            type MyType = i32;
        };

        assert!(has_derive_type(&test_type.attrs));

        let test_enum: ItemEnum = parse_quote! {
            #[derive(Type)]
            enum MyEnunType {
                Variant1,
                Variant2,
            }
        };

        assert!(has_derive_type(&test_enum.attrs));

        let test_struct_without_type: ItemStruct = parse_quote! {
            struct MyStruct;
        };

        assert!(!has_derive_type(&test_struct_without_type.attrs));

        let multi_derived_trait: ItemStruct = parse_quote! {
            #[derive(Type, Serialize, Debug)]
            struct MyStruct;
        };

        assert!(has_derive_type(&multi_derived_trait.attrs));
    }

    #[test]
    fn it_detects_the_type_and_props_attribute_macros() {
        let type_attr: ItemStruct = parse_quote! {
            #[Type]
            struct MyStruct { field: String }
        };
        assert!(has_derive_type(&type_attr.attrs));

        let props_attr: ItemStruct = parse_quote! {
            #[Props]
            struct MyProps { field: String }
        };
        assert!(has_derive_type(&props_attr.attrs));

        // Fully-qualified path form: `#[ossido::Type]`.
        let qualified: ItemEnum = parse_quote! {
            #[ossido::Type]
            enum MyEnum { A, B }
        };
        assert!(has_derive_type(&qualified.attrs));

        // Other attributes (serde, derive-without-Type, doc) must not match.
        let unrelated: ItemStruct = parse_quote! {
            #[derive(Clone, Debug)]
            #[serde(rename_all = "camelCase")]
            struct Plain { field: String }
        };
        assert!(!has_derive_type(&unrelated.attrs));
    }
}
