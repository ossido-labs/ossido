//! Baseline scope globals: the `global` alias and a native `queueMicrotask`.
//!
//! `global` replaces the bundle-side `globalScope` shim (UMD polyfill init
//! IIFEs expect a `global`/`window`-like object). `queueMicrotask` is an HTML
//! spec global that V8 itself does not provide to embedders; libraries
//! (React included) feature-detect it, and the native version feeds V8's own
//! microtask queue — the cheapest scheduling primitive the runtime has.

/// `queueMicrotask(fn)` — enqueue on the isolate's native microtask queue
/// (drained by the render pump's checkpoints).
pub(crate) fn queue_microtask_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let Ok(callback) = v8::Local::<v8::Function>::try_from(args.get(0)) else {
        super::text_codecs::throw_type_error(
            scope,
            "queueMicrotask: the callback must be a function",
        );
        return;
    };
    scope.enqueue_microtask(callback);
}

/// The `global` alias, so UMD-style module wrappers find a scope object.
pub(crate) const SCOPE_BOOTSTRAP: &str = r#"
(function () {
  "use strict";
  if (typeof globalThis.global === "undefined") {
    globalThis.global = globalThis;
  }
})();
"#;
