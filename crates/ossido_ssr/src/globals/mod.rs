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
//! Two kinds of entries:
//! * `function "name" = path::to::callback;` — a bare native function on
//!   `globalThis` (the `__ossido_*` backends the bootstraps build classes over).
//! * `bootstrap path::TO_SCRIPT;` — a JS snippet run after all functions are
//!   installed, defining the spec-shaped classes (`TextEncoder`, …).
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

/// Define a native function on the context's global object.
pub(crate) fn set_global_fn(
    scope: &mut v8::HandleScope,
    name: &str,
    callback: impl v8::MapFnTo<v8::FunctionCallback>,
) {
    let context = scope.get_current_context();
    let global = context.global(scope);
    if let (Some(name), Some(function)) = (
        v8::String::new(scope, name),
        v8::Function::new(scope, callback),
    ) {
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
/// [`install_runtime_globals`]. Functions install first (in order), then
/// bootstraps — a bootstrap may reference any registered function.
macro_rules! runtime_globals {
    (
        $( function $name:literal = $callback:path; )*
        $( bootstrap $script:path; )*
    ) => {
        /// Install every registered native global into the current context.
        /// Must run before the bundle evaluates, so conditionally-installed
        /// polyfills (`scope.X = scope.X || …`) keep the natives.
        pub(crate) fn install_runtime_globals(scope: &mut v8::HandleScope) {
            $( set_global_fn(scope, $name, $callback); )*
            $( run_bootstrap(scope, $script); )*
        }
    };
}

runtime_globals! {
    function "queueMicrotask" = scope::queue_microtask_callback;
    function "__ossido_encoding_for_label" = text_codecs::encoding_for_label_callback;
    function "__ossido_encode_utf8" = text_codecs::encode_utf8_callback;
    function "__ossido_encode_into" = text_codecs::encode_into_callback;
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
