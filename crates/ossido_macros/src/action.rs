use proc_macro2::{Span, TokenStream};
use quote::quote;
use syn::punctuated::Punctuated;
use syn::token::Comma;
use syn::{FnArg, GenericArgument, Ident, ItemFn, Pat, PathArguments, ReturnType, Type};

use crate::utils::{
    crate_application_state_extractor, create_struct_fn_arg, import_main_application_state,
    is_logger_pat, params_argument, request_argument,
};

/// The role each argument of an `#[action]` function plays, in declared order.
enum Role {
    /// The decoded action input (the first non-`PrevState`, non-`Files`,
    /// non-`logger`, non-state argument). Bound to `__ossido_input`.
    Input,
    /// A `PrevState<T>` argument — the previous `useActionState` value. Bound to
    /// `__ossido_prev`.
    Prev,
    /// A `Files` argument — files uploaded via `multipart/form-data`. Bound to
    /// `__ossido_files`.
    Files,
    /// The framework `logger`.
    Logger(Pat),
    /// An `ApplicationState` field, destructured by name.
    State(Pat),
}

pub fn action_core(attrs: TokenStream, item: TokenStream) -> TokenStream {
    // Optional TypeScript export name: `#[action(createUser)]` or
    // `#[action("createUser")]`. The name is consumed by the CLI codegen (which
    // reads the source attribute); here we only validate its shape. Empty is
    // fine — the name defaults to the camelCased Rust name.
    if !attrs.is_empty()
        && syn::parse2::<Ident>(attrs.clone()).is_err()
        && syn::parse2::<syn::LitStr>(attrs.clone()).is_err()
    {
        return syn::Error::new_spanned(
            &attrs,
            "`#[action]` takes an optional TypeScript name: `#[action(myName)]` or `#[action(\"myName\")]`",
        )
        .to_compile_error();
    }

    let item = match syn::parse2::<ItemFn>(item) {
        Ok(item) => item,
        Err(err) => return err.to_compile_error(),
    };

    let fn_name = &item.sig.ident;
    let handler_name = Ident::new(&format!("{fn_name}_ossido_internal_action"), Span::call_site());

    let mut roles: Vec<Role> = Vec::new();
    let mut state_field_names: Punctuated<Pat, Comma> = Punctuated::new();
    let mut input_ty: Option<Type> = None;
    let mut prev_ty: Option<Type> = None;
    let mut has_logger = false;
    let mut has_files = false;

    for arg in item.sig.inputs.iter() {
        let FnArg::Typed(pat_type) = arg else {
            return syn::Error::new_spanned(arg, "`#[action]` functions cannot take `self`")
                .to_compile_error();
        };
        let pat = (*pat_type.pat).clone();
        let ty = (*pat_type.ty).clone();

        if let Some(inner) = prev_state_inner(&ty) {
            if prev_ty.is_some() {
                return syn::Error::new_spanned(arg, "an action can declare at most one `PrevState`")
                    .to_compile_error();
            }
            prev_ty = Some(inner);
            roles.push(Role::Prev);
        } else if is_files_type(&ty) {
            if has_files {
                return syn::Error::new_spanned(arg, "an action can declare at most one `Files`")
                    .to_compile_error();
            }
            has_files = true;
            roles.push(Role::Files);
        } else if is_logger_pat(&pat) {
            has_logger = true;
            roles.push(Role::Logger(pat));
        } else if input_ty.is_none() {
            input_ty = Some(ty);
            roles.push(Role::Input);
        } else {
            state_field_names.push(pat.clone());
            roles.push(Role::State(pat));
        }
    }

    // The arguments forwarded to the user function, in declared order.
    let call_args: Vec<TokenStream> = roles
        .iter()
        .map(|role| match role {
            Role::Input => quote!(__ossido_input),
            Role::Prev => quote!(__ossido_prev),
            Role::Files => quote!(__ossido_files),
            Role::Logger(pat) => quote!(#pat),
            Role::State(pat) => quote!(#pat),
        })
        .collect();

    // Axum extractors: Path(params), optional State, Request.
    let mut axum_arguments: Punctuated<FnArg, Comma> = Punctuated::new();
    axum_arguments.push(params_argument());
    if !state_field_names.is_empty() {
        axum_arguments.push(create_struct_fn_arg());
    }
    axum_arguments.push(request_argument());

    let application_state_import = import_main_application_state(state_field_names.clone());
    let application_state_extractor = crate_application_state_extractor(state_field_names.clone());

    let logger_binding = if has_logger {
        quote! { let logger = ossido::Logger::new(&req); }
    } else {
        quote! {}
    };

    // The request body is decoded once (a multipart body may be large / carry
    // files), then the input, prev-state, and files are pulled from it. Only the
    // files path needs `&mut`, so `mut` is emitted only then.
    let form_binding = if has_files {
        quote! { let mut __ossido_form = ossido::action::decode_form(&req).await; }
    } else {
        quote! { let __ossido_form = ossido::action::decode_form(&req).await; }
    };
    let files_binding = if has_files {
        quote! { let __ossido_files = __ossido_form.take_files(); }
    } else {
        quote! {}
    };

    let prev_binding = match &prev_ty {
        Some(ty) => quote! {
            let __ossido_prev = __ossido_form.prev_state::<#ty>();
        },
        None => quote! {},
    };

    // The user function returns either `Result<T, ActionError>` or a bare `T`.
    // The runtime always takes a `Result<T, ActionError>`, so a bare return is
    // wrapped in `Ok(..)`.
    let returns_result = matches!(&item.sig.output, ReturnType::Type(_, ty) if is_result(ty));

    let call_body = if returns_result {
        quote! { #fn_name(#(#call_args),*) }
    } else {
        quote! { async move { Ok::<_, ossido::ActionError>(#fn_name(#(#call_args),*).await) } }
    };

    let dispatch = match &input_ty {
        Some(ty) => quote! {
            let __ossido_decoded = __ossido_form.input::<#ty>();
            ossido::action::run_action(&req, __ossido_decoded, move |__ossido_input| #call_body).await
        },
        None => quote! {
            ossido::action::run_action_no_input(&req, move || #call_body).await
        },
    };

    quote! {
        #application_state_import

        #item

        pub async fn #handler_name(#axum_arguments) -> ossido::axum::response::Response {
            #application_state_extractor

            let (parts, body) = request.into_parts();
            let path = parts.uri.clone();
            let headers = parts.headers.clone();
            let body = ossido::axum::body::to_bytes(body, usize::MAX)
                .await
                .unwrap_or(Vec::new().into())
                .to_vec();
            let req = ossido::Request::new(path, headers, params, Some(body));

            #logger_binding

            #form_binding
            #files_binding
            #prev_binding

            #dispatch
        }
    }
}

/// Whether a type is the framework `Files` collection (matched by the last path
/// segment, so `ossido::Files` and `Files` both count).
fn is_files_type(ty: &Type) -> bool {
    let Type::Path(type_path) = ty else {
        return false;
    };
    type_path
        .path
        .segments
        .last()
        .map(|segment| segment.ident == "Files")
        .unwrap_or(false)
}

/// The inner `T` of a `PrevState<T>` type, if this is one.
fn prev_state_inner(ty: &Type) -> Option<Type> {
    let Type::Path(type_path) = ty else {
        return None;
    };
    let segment = type_path.path.segments.last()?;
    if segment.ident != "PrevState" {
        return None;
    }
    let PathArguments::AngleBracketed(args) = &segment.arguments else {
        return None;
    };
    match args.args.first()? {
        GenericArgument::Type(inner) => Some(inner.clone()),
        _ => None,
    }
}

/// Whether a return type is a `Result<...>` (matched by the last path segment).
fn is_result(ty: &Type) -> bool {
    let Type::Path(type_path) = ty else {
        return false;
    };
    type_path
        .path
        .segments
        .last()
        .map(|segment| segment.ident == "Result")
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn expand(item: TokenStream) -> String {
        action_core(TokenStream::new(), item).to_string().replace(' ', "")
    }

    fn expand_with(attrs: TokenStream, item: TokenStream) -> String {
        action_core(attrs, item).to_string().replace(' ', "")
    }

    #[test]
    fn accepts_an_optional_name_argument_and_rejects_junk() {
        let item = quote! { async fn create_user(input: In) -> Result<Out, ActionError> { todo!() } };
        // A bare ident or string literal name is accepted (the CLI reads it; the
        // macro just generates the handler as usual).
        assert!(expand_with(quote!(createUser), item.clone())
            .contains("create_user_ossido_internal_action"));
        assert!(expand_with(quote!("createUser"), item.clone())
            .contains("create_user_ossido_internal_action"));
        // Anything that is not an ident or string literal is a clear error.
        assert!(expand_with(quote!(1 + 2), item).contains("compile_error!"));
    }

    #[test]
    fn a_simple_action_generates_the_handler_and_buffers_the_body() {
        let out = expand(quote! {
            async fn create_user(input: CreateUser, db: Db) -> Result<Created, ActionError> { todo!() }
        });
        assert!(out.contains("pubasyncfncreate_user_ossido_internal_action"));
        // Preserves the original function.
        assert!(out.contains("asyncfncreate_user(input:CreateUser,db:Db)"));
        // Buffers the body like a POST.
        assert!(out.contains("to_bytes"));
        // Decodes the body once, then the first non-state argument as the input.
        assert!(out.contains("decode_form(&req).await"));
        assert!(out.contains("__ossido_form.input::<CreateUser>()"));
        // Forwards input + state to the user function.
        assert!(out.contains("run_action(&req,__ossido_decoded,move|__ossido_input|create_user(__ossido_input,db)"));
        // Extracts application state.
        assert!(out.contains("letApplicationState{db,..}=state;"));
    }

    #[test]
    fn a_bare_return_is_wrapped_in_ok() {
        let out = expand(quote! {
            async fn subscribe(form: Subscribe) -> FormState { todo!() }
        });
        assert!(out.contains("Ok::<_,ossido::ActionError>(subscribe(__ossido_input).await)"));
    }

    #[test]
    fn a_stateful_action_decodes_prev_state() {
        let out = expand(quote! {
            async fn submit(prev: PrevState<FormState>, form: Subscribe, db: Db) -> FormState { todo!() }
        });
        assert!(out.contains("__ossido_form.prev_state::<FormState>()"));
        // prev is forwarded ahead of the input, in declared order.
        assert!(out.contains("submit(__ossido_prev,__ossido_input,db)"));
    }

    #[test]
    fn a_logger_is_bound_and_not_treated_as_state() {
        let out = expand(quote! {
            async fn ping(input: Ping, logger: Logger) -> Result<Pong, ActionError> { todo!() }
        });
        assert!(out.contains("letlogger=ossido::Logger::new(&req)"));
        assert!(out.contains("ping(__ossido_input,logger)"));
        assert!(!out.contains("State(state)"));
    }

    #[test]
    fn a_files_parameter_is_decoded_and_forwarded() {
        let out = expand(quote! {
            async fn upload(input: Meta, files: Files) -> Result<Done, ActionError> { todo!() }
        });
        assert!(out.contains("decode_form(&req).await"));
        assert!(out.contains("let__ossido_files=__ossido_form.take_files();"));
        // input + files forwarded in declared order; files is not the input.
        assert!(out.contains("decode_form(&req).await"));
        assert!(out.contains("upload(__ossido_input,__ossido_files)"));
    }

    #[test]
    fn a_files_only_action_takes_no_input() {
        let out = expand(quote! {
            async fn upload(files: Files) -> Result<Done, ActionError> { todo!() }
        });
        assert!(out.contains("run_action_no_input"));
        assert!(out.contains("upload(__ossido_files)"));
    }

    #[test]
    fn a_zero_input_action_uses_run_action_no_input() {
        let out = expand(quote! {
            async fn logout(session: Session) -> Result<Bye, ActionError> { todo!() }
        });
        // `session` is the first candidate, so it is the input, not state — a
        // truly zero-argument action:
        let out2 = expand(quote! {
            async fn heartbeat() -> Result<Tick, ActionError> { todo!() }
        });
        assert!(out2.contains("run_action_no_input"));
        // With one argument, that argument is the input.
        assert!(out.contains("__ossido_form.input::<Session>()"));
    }
}
