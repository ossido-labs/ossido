//! The native globals ossido_ssr injects into every context, and the
//! declarative registry that installs them.
//!
//! Inspired by Bun's `#[JsClass]` / `#[host_fn]` registration macros (their
//! Rust runtime declares a class once and codegen wires it into JSC): here a
//! global is declared once in the [`runtime_globals!`] block below and
//! [`install_runtime_globals`] — called for every new isolate before any
//! bundle evaluates — installs the whole set. Adding a native global is one
//! `function`/`bootstrap` line plus its implementation module; no per-callsite
//! wiring in `ssr.rs`.
//!
//! Three kinds of entries:
//! * `function "name" = path::to::callback;` — a bare native function on
//!   `globalThis` (the `__ossido_*` backends the bootstraps build classes over).
//! * `function "name" = path::to::callback (fast path::TO_CFUNCTION);` — the
//!   same, plus a V8 **fast API call** overload: once TurboFan optimises a hot
//!   call site it calls the `CFunction` directly from JIT code, skipping the
//!   `FunctionCallbackInfo` trampoline. The slow callback stays as the semantic
//!   fallback (interpreted frames, argument-type mismatches).
//! * `bootstrap path::TO_SCRIPT;` — a JS snippet run after all functions are
//!   installed, defining the spec-shaped classes (`TextEncoder`, …).
//!
//! The registry is also the single source of truth for the V8 **external
//! references** table ([`external_references`]): every native address a
//! startup-snapshotted heap can reach — slow callbacks, fast-call function
//! pointers and their type-info structs — is enumerated from the same
//! declarations that install it, so the two can never drift. A snapshot
//! produced and restored with mismatched tables aborts deserialization, which
//! is why this list is generated rather than hand-maintained.
//!
//! Globals whose state lives in an **isolate slot** with an owned lifecycle
//! (the timer queue, the streaming-decoder registry) additionally have an
//! explicit `install_*` step in `ssr.rs`'s constructors — the registry only
//! covers the context-scoped surface.

pub(crate) mod message_channel;
pub(crate) mod scope;
pub(crate) mod text_codecs;
pub(crate) mod timers;
pub(crate) mod url_search_params;

/// Wrapper letting fast-call descriptors (`CFunction` / `CFunctionInfo`,
/// which embed raw pointers to code and to immutable statics) live in
/// `static`s — the raw pointers make them `!Sync` by default.
pub(crate) struct FastCallDescriptor<T>(pub T);
// Safety: the wrapped descriptors are immutable and point only at `'static`
// data and function code; sharing them across threads is sound.
unsafe impl<T> Sync for FastCallDescriptor<T> {}

/// Define a native function on the context's global object.
pub(crate) fn set_global_fn(
    scope: &mut v8::HandleScope,
    name: &str,
    callback: impl v8::MapFnTo<v8::FunctionCallback>,
) {
    set_global_fn_with_overloads(scope, name, callback, &[]);
}

/// Like [`set_global_fn`], but when `overloads` is non-empty the function is
/// built from a template carrying the fast-call overloads, so optimised code
/// calls the `CFunction` directly. An empty slice degrades to the plain path
/// (`v8::Function::new`).
pub(crate) fn set_global_fn_with_overloads(
    scope: &mut v8::HandleScope,
    name: &str,
    callback: impl v8::MapFnTo<v8::FunctionCallback>,
    overloads: &[v8::fast_api::CFunction],
) {
    let context = scope.get_current_context();
    let global = context.global(scope);
    let Some(name) = v8::String::new(scope, name) else {
        return;
    };
    let function = if overloads.is_empty() {
        v8::Function::new(scope, callback)
    } else {
        let template = v8::FunctionTemplate::builder(callback).build_fast(scope, overloads);
        template.get_function(scope)
    };
    if let Some(function) = function {
        global.set(scope, name.into(), function.into());
    }
}

/// Compile and run a bootstrap snippet (a class definition over native fns).
fn run_bootstrap(scope: &mut v8::HandleScope, source: &str) {
    if let Some(code) = v8::String::new(scope, source) {
        if let Some(script) = v8::Script::compile(scope, code, None) {
            let _ = script.run(scope);
        }
    }
}

/// Declare the runtime's global surface; expands to
/// [`install_runtime_globals`] and [`registry_external_references`]. Functions
/// install first (in order), then bootstraps — a bootstrap may reference any
/// registered function.
macro_rules! runtime_globals {
    (
        $( function $name:literal = $callback:path $( [fast $cfn:path] )? ; )*
        $( bootstrap $script:path; )*
    ) => {
        /// Install every registered native global into the current context.
        /// Must run before the bundle evaluates, so conditionally-installed
        /// polyfills (`scope.X = scope.X || …`) keep the natives.
        pub(crate) fn install_runtime_globals(scope: &mut v8::HandleScope) {
            $( set_global_fn_with_overloads(scope, $name, $callback, &[ $( $cfn.0, )? ]); )*
            $( run_bootstrap(scope, $script); )*
        }

        /// Every native address the registry's globals embed in the heap:
        /// each slow callback, plus each fast overload's function pointer and
        /// type-info struct. This is what lets a startup snapshot serialize
        /// (and later resolve) the installed functions.
        // Sequential pushes are what lets the optional fast-overload
        // repetition expand per entry; a `vec![]` literal cannot.
        #[allow(clippy::vec_init_then_push)]
        pub(crate) fn registry_external_references() -> Vec<v8::ExternalReference<'static>> {
            use v8::MapFnTo;
            let mut refs: Vec<v8::ExternalReference<'static>> = Vec::new();
            $(
                refs.push(v8::ExternalReference { function: $callback.map_fn_to() });
                $(
                    refs.push(v8::ExternalReference {
                        pointer: $cfn.0.address() as *mut std::ffi::c_void,
                    });
                    refs.push(v8::ExternalReference { type_info: $cfn.0.type_info() });
                )?
            )*
            refs
        }
    };
}

runtime_globals! {
    function "queueMicrotask" = scope::queue_microtask_callback;
    function "__ossido_encoding_for_label" = text_codecs::encoding_for_label_callback;
    function "__ossido_encode_utf8" = text_codecs::encode_utf8_callback;
    function "__ossido_encode_into" = text_codecs::encode_into_callback [fast text_codecs::ENCODE_INTO_CFN];
    function "__ossido_decode" = text_codecs::decode_callback;
    function "__ossido_decoder_new" = text_codecs::decoder_new_callback;
    function "__ossido_decoder_decode" = text_codecs::decoder_decode_callback;
    function "__ossido_decoder_free" = text_codecs::decoder_free_callback;
    function "__ossido_urlencoded_parse" = url_search_params::urlencoded_parse_callback;
    function "__ossido_urlencoded_serialize" = url_search_params::urlencoded_serialize_callback;
    bootstrap scope::SCOPE_BOOTSTRAP;
    bootstrap text_codecs::TEXT_CODEC_BOOTSTRAP;
    bootstrap message_channel::MESSAGE_CHANNEL_BOOTSTRAP;
    bootstrap url_search_params::URL_SEARCH_PARAMS_BOOTSTRAP;
}

/// The process-wide external-references table: the registry's callbacks plus
/// the slot-lifecycle globals installed outside it (timers, the streaming
/// writer). Passed to **both** snapshot creation and every
/// snapshot-restoring isolate — V8 resolves serialized native addresses by
/// index into this table, so the produce and consume sides must be the
/// identical list (guaranteed here by both reading the same static).
pub(crate) fn external_references() -> &'static v8::ExternalReferences {
    static REFS: std::sync::OnceLock<v8::ExternalReferences> = std::sync::OnceLock::new();
    REFS.get_or_init(|| {
        let mut refs = registry_external_references();
        refs.extend(timers::external_references());
        refs.extend(crate::ssr::stream_external_references());
        v8::ExternalReferences::new(&refs)
    })
}
