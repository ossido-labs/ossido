#![allow(clippy::question_mark)]
use std::ffi::c_void;
use std::fmt;

use rustc_hash::FxHashMap;

use crate::globals::install_runtime_globals;
use crate::globals::text_codecs::{install_decoder_registry, DecoderRegistry};
use crate::globals::timers::{install_timers, reset_macrotasks, run_macrotasks, TimerQueue};

/// This enum holds all the possible Ssr error states.
#[derive(Debug, PartialEq, Eq)]
pub enum SsrError {
    InvalidJs(&'static str),
    FailedToParseJs(&'static str),
    FailedJsExecution(&'static str),
    /// A rendered promise rejected (or the function threw). Carries the
    /// stringified JS error/rejection reason so callers can surface it.
    JsException(String),
    InvalidFunctionName,
    InvalidFunction,
}

impl fmt::Display for SsrError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{self:?}")
    }
}

/// Build a [`SsrError::JsException`] from a rejected promise's reason so callers
/// see the actual JS error rather than an opaque message.
fn rejection_error(scope: &mut v8::HandleScope, promise: v8::Local<v8::Promise>) -> SsrError {
    let reason = promise
        .result(scope)
        .to_string(scope)
        .map(|s| s.to_rust_string_lossy(scope))
        .unwrap_or_else(|| "<unknown rejection reason>".to_string());
    SsrError::JsException(reason)
}

/// Module-resolution callback for [`Ssr::from_module`].
///
/// The SSR bundle is fully self-contained (vite `noExternal` inlines every
/// dependency), so it has no static imports and this is never invoked. If a
/// stray import ever appears, returning `None` makes `instantiate_module` fail
/// cleanly rather than reaching for a module that isn't there.
fn no_import_resolve_callback<'a>(
    _context: v8::Local<'a, v8::Context>,
    _specifier: v8::Local<'a, v8::String>,
    _import_attributes: v8::Local<'a, v8::FixedArray>,
    _referrer: v8::Local<'a, v8::Module>,
) -> Option<v8::Local<'a, v8::Module>> {
    None
}

/// Consecutive no-progress rounds after which a pending render is treated as
/// genuinely unresolvable (e.g. a live `fetch` with no polyfill) and aborted,
/// rather than hung. A "round" is: drain microtasks, run one macrotask
/// generation, drain microtasks again. A converging React render never has this
/// many empty rounds in a row.
const MAX_IDLE_ROUNDS: u32 = 16;
/// Hard ceiling on total rounds so a pathological generator that always
/// enqueues one more macrotask still terminates.
const MAX_TOTAL_ROUNDS: u32 = 1_000_000;

/// Drive an async operation to completion by alternately pumping V8 microtasks
/// and one macrotask generation — a real event-loop turn — until `pending()`
/// reports the work has settled. Aborts with `SsrError` if neither queue makes
/// progress for [`MAX_IDLE_ROUNDS`] rounds (or the hard [`MAX_TOTAL_ROUNDS`]
/// ceiling), so genuinely-unresolvable async errors instead of hanging.
///
/// `pending` reads render state that needs no scope (`promise.state()` /
/// `module.get_status()`), so it never conflicts with the mutable `scope`
/// borrowed for the pumps.
fn pump_until(
    scope: &mut v8::HandleScope,
    mut pending: impl FnMut() -> bool,
    stuck_message: &'static str,
) -> Result<(), SsrError> {
    let mut idle_rounds = 0u32;
    let mut total_rounds = 0u32;

    while pending() {
        scope.perform_microtask_checkpoint();
        if !pending() {
            break;
        }

        let ran = run_macrotasks(scope);
        scope.perform_microtask_checkpoint();
        if !pending() {
            break;
        }

        total_rounds += 1;
        if ran {
            idle_rounds = 0;
        } else {
            idle_rounds += 1;
        }

        if idle_rounds >= MAX_IDLE_ROUNDS || total_rounds >= MAX_TOTAL_ROUNDS {
            return Err(SsrError::FailedJsExecution(stuck_message));
        }
    }

    Ok(())
}

// Streaming support
//
// None of this is touched unless a caller opts into streaming; `render` /
// `render_to_string` are unaffected.

/// A destination for the chunks a streaming render emits. Implement this on your
/// writer and lend it to a render with [`Streaming::render`]; a plain
/// `FnMut(&str)` closure also works via the blanket impl below. Nothing needs to
/// be `'static` — the sink is only borrowed for the duration of the render.
pub trait StreamSink {
    /// Handle one chunk emitted by the bundle (via the writer global).
    fn write_chunk(&mut self, chunk: &str);

    /// Owned variant of [`StreamSink::write_chunk`]. The V8 bridge already
    /// marshals each chunk into an owned `String`, so a sink that needs
    /// ownership anyway (e.g. to send the chunk across a channel) can override
    /// this and skip a second copy. The default delegates to `write_chunk`.
    fn write_chunk_owned(&mut self, chunk: String) {
        self.write_chunk(&chunk);
    }
}

impl<F: FnMut(&str)> StreamSink for F {
    fn write_chunk(&mut self, chunk: &str) {
        self(chunk)
    }
}

/// Isolate data slot holding the `*mut &mut dyn StreamSink` that [`Streaming::render`]
/// lends for the duration of a streaming render (null at all other times). This
/// is how the bare V8 writer callback — which takes no captures — reaches the
/// caller's borrowed sink without any thread-local or `'static` state.
const SINK_SLOT: u32 = 0;

/// Installs a borrowed sink pointer into the isolate's [`SINK_SLOT`] for the
/// lifetime of a streaming render, restoring the previous value on return or
/// unwind (so nested renders behave as a stack).
struct SinkGuard {
    isolate: *mut v8::OwnedIsolate,
    prev: *mut c_void,
}

impl Drop for SinkGuard {
    fn drop(&mut self) {
        unsafe { (*self.isolate).set_data(SINK_SLOT, self.prev) };
    }
}

/// The writer global (installed by [`Ssr::streaming`]) that a streaming bundle
/// calls to emit chunks: forwards each to the sink borrowed for this render.
fn stream_write_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let Some(chunk) = args.get(0).to_string(scope) else {
        return;
    };
    let chunk = chunk.to_rust_string_lossy(scope);

    // `HandleScope` derefs to `Isolate`, so read back the sink pointer lent by
    // the in-flight `Streaming::render`. Null means no streaming render is
    // active (e.g. the bundle called the writer outside a stream) — ignore it.
    let ptr = scope.get_data(SINK_SLOT) as *mut &mut dyn StreamSink;
    if ptr.is_null() {
        return;
    }

    // Safety: `Streaming::render` writes this slot with the address of a
    // `&mut dyn StreamSink` it exclusively borrows for the whole render and
    // clears before returning, so the pointer is live and unaliased here. A
    // nested render installs its own slot value and restores ours, never
    // touching this pointee.
    let sink = unsafe { &mut *ptr };
    // `chunk` is already an owned marshal of the V8 string; hand over ownership
    // so sinks that forward it (channels) need no second copy.
    sink.write_chunk_owned(chunk);
}

/// A streaming render session over an [`Ssr`] isolate, created by
/// [`Ssr::streaming`]. Where [`Ssr::render`] buffers the whole result into one
/// string, a streaming render invokes a caller sink for each chunk the bundle
/// emits (via the writer global) as it is produced — e.g. to flush an HTML shell
/// to the client before the rest of the page is ready.
pub struct Streaming<'ssr, 's, 'i> {
    ssr: &'ssr mut Ssr<'s, 'i>,
}

impl<'s, 'i> Streaming<'_, 's, 'i> {
    /// Render the `entry` streaming export, invoking `sink.write_chunk` for each
    /// chunk it emits via the writer global (including across `await` points).
    /// Returns once the render's promise resolves; a rejected promise (e.g. a
    /// shell error before any chunk) is surfaced as [`SsrError::JsException`].
    ///
    /// The caller instantiates `sink` (any [`StreamSink`] — including a plain
    /// `FnMut(&str)` closure) and lends it to the render; it is only borrowed for
    /// the duration of this call, so it can hold borrowed local state and need
    /// not be `'static`. Nested streaming renders on one thread are supported
    /// (the borrowed sink is installed as a stack).
    ///
    /// Note: like the other async-aware methods, completion is driven by
    /// [`pump_until`] — microtasks plus the macrotask queue (`setTimeout` /
    /// `MessageChannel`) installed by the SSR bundle's `macrotasks` polyfill.
    pub fn render(
        &mut self,
        entry: &str,
        params: Option<&str>,
        sink: &mut dyn StreamSink,
    ) -> Result<(), SsrError> {
        // Lend the sink to the writer callback for this render by stashing the
        // address of the `&mut dyn StreamSink` (a fat pointer) in the isolate
        // slot; the guard restores the previous occupant on return/unwind.
        let mut sink: &mut dyn StreamSink = sink;
        let slot = &mut sink as *mut &mut dyn StreamSink as *mut c_void;
        let isolate = self.ssr.isolate;
        let prev = unsafe { (*isolate).get_data(SINK_SLOT) };
        unsafe { (*isolate).set_data(SINK_SLOT, slot) };
        let _guard = SinkGuard { isolate, prev };

        // The streaming export emits chunks via the writer global and returns
        // nothing; drive it with the plain `render` and discard the result.
        let result = self.ssr.render(entry, params).map(|_| ());

        // Anything that ran during the render (e.g. a nested render on another
        // isolate) must leave our slot untouched, since every render restores
        // its slot before returning - innermost first, so the value we set is
        // the one still present here. If the slot no longer holds our pointer a
        // guard failed to restore and the raw-pointer bridge is no longer sound
        // - catch that in debug builds rather than read a stale pointer later.
        debug_assert_eq!(
            unsafe { (*isolate).get_data(SINK_SLOT) },
            slot,
            "streaming sink slot was not restored (innermost render first) during the render",
        );

        result
    }
}

/// The result of building an [`Ssr`] from an ES module via
/// [`Ssr::from_module_with_cache`]: the isolate itself plus the V8 **code
/// cache** outcome (serialized Ignition bytecode + metadata that lets a later
/// build skip the parse+compile of the same source).
pub struct ModuleBuild<'s, 'i> {
    pub ssr: Ssr<'s, 'i>,
    /// Cache bytes serialized from a fresh eager compile (the produce path).
    /// `None` when a supplied cache was consumed, or when V8 declined to
    /// serialize the script.
    pub produced_cache: Option<Vec<u8>>,
    /// The supplied cache was rejected (stale V8 version/flags, corrupt bytes)
    /// and the module was transparently recompiled from source instead —
    /// [`ModuleBuild::ssr`] is still fully valid. Callers should drop the stale
    /// cache so a later cold build regenerates it.
    pub cache_rejected: bool,
}

/// How [`Ssr::build_module`] treats the V8 code cache for the module compile.
enum CacheMode<'a> {
    /// Plain compile: no cache produced or consumed ([`Ssr::from_module`]).
    None,
    /// Compile eagerly and serialize a fresh code cache.
    Produce,
    /// Compile consuming a previously produced code cache.
    Consume(&'a [u8]),
}

/// This struct holds all the necessary v8 utilities to
/// execute Javascript code.
/// It cannot be shared across threads.
#[derive(Debug)]
pub struct Ssr<'s, 'i> {
    isolate: *mut v8::OwnedIsolate,
    handle_scope: *mut v8::HandleScope<'s, ()>,
    fn_map: FxHashMap<String, v8::Local<'s, v8::Function>>,
    scope: *mut v8::ContextScope<'i, v8::HandleScope<'s>>,
    /// The writer global installed by [`Ssr::streaming`], if any — so repeated
    /// `streaming` calls on this isolate don't re-allocate the V8 function.
    /// `None` for isolates that never opt into streaming.
    stream_writer: Option<&'static str>,
    /// The native timer queue (see [`install_timers`]), or null for `Ssr::from`
    /// (classic-script) isolates, which have no timers and run microtask-only.
    timer_queue: *mut TimerQueue,
    /// The streaming-decoder registry backing `TextDecoder`'s `{stream: true}`
    /// state (see [`install_decoder_registry`]). Owned here, freed on drop.
    decoder_registry: *mut DecoderRegistry,
}

impl Drop for Ssr<'_, '_> {
    fn drop(&mut self) {
        self.fn_map.clear();
        unsafe {
            // Free the timer queue (dropping its `v8::Global` callbacks) while
            // the isolate is still alive.
            if !self.timer_queue.is_null() {
                let _ = Box::from_raw(self.timer_queue);
            }
            if !self.decoder_registry.is_null() {
                let _ = Box::from_raw(self.decoder_registry);
            }
            let _ = Box::from_raw(self.scope);
            let _ = Box::from_raw(self.handle_scope);
            let _ = Box::from_raw(self.isolate);
        };
    }
}

impl<'s, 'i> Ssr<'s, 'i>
where
    's: 'i,
{
    /// Initialize a V8 js engine instance. It's mandatory to call it before
    /// any call to V8. The Ssr module needs this function call before any other
    /// operation. It cannot be called more than once per process.
    pub fn create_platform() {
        Self::create_platform_with_flags(None);
    }

    /// Like [`Ssr::create_platform`], but first hands `flags` (a space-separated
    /// V8 command-line flag string, e.g. `"--no-lazy-feedback-allocation"`) to
    /// V8. Flags must be set before initialization — this is the only point in
    /// the process where they can take effect. Unknown flags are warned about
    /// and ignored by V8, so passing through user-supplied flags is safe. When
    /// two flags conflict, the later one wins.
    pub fn create_platform_with_flags(flags: Option<&str>) {
        if let Some(flags) = flags {
            v8::V8::set_flags_from_string(flags);
        }

        let platform = v8::new_default_platform(0, false).make_shared();
        v8::V8::initialize_platform(platform);
        v8::V8::initialize();

        v8::icu::set_common_data_74(crate::icu::ICU_DATA).expect("Failed to set ICU data");
    }

    /// It creates a new SSR instance (multiple instances are allowed).
    ///
    /// This function is expensive and it should be called as less as possible.
    ///
    /// Even though V8 allows multiple threads the Ssr struct created with this call can be accessed by just
    /// the thread that created it.
    ///
    /// Entry point is the JS element that the bundler exposes. It has to be an empty string in
    /// case the bundle is exported as IIFE.
    ///
    /// Check the examples <a href="https://github.com/ossido-labs/ossido/tree/main/examples/vite-react">vite-react</a> (for the IIFE example) and
    /// <a href="https://github.com/ossido-labs/ossido/tree/main/examples/webpack-react">webpack-react</a> (for the bundle exported as variable).
    ///
    /// See the examples folder for more about using multiple parallel instances for multi-threaded
    /// execution.
    pub fn from(source: String, entry_point: &str) -> Result<Self, SsrError> {
        let isolate = Box::into_raw(Box::new(v8::Isolate::new(v8::CreateParams::default())));

        let handle_scope = unsafe { Box::into_raw(Box::new(v8::HandleScope::new(&mut *isolate))) };

        let context = unsafe { v8::Context::new(&mut *handle_scope, Default::default()) };

        let scope_ptr =
            unsafe { Box::into_raw(Box::new(v8::ContextScope::new(&mut *handle_scope, context))) };

        let scope = unsafe { &mut *scope_ptr };

        // The registered native globals (text codecs, …) before the bundle
        // runs, so its conditional polyfills keep them.
        install_runtime_globals(scope);
        let decoder_registry = install_decoder_registry(isolate);

        let code = match v8::String::new(scope, &format!("{source};{entry_point}")) {
            Some(val) => val,
            None => return Err(SsrError::InvalidJs("Strings are needed")),
        };

        let script = match v8::Script::compile(scope, code, None) {
            Some(val) => val,
            None => return Err(SsrError::InvalidJs("There aren't runnable scripts")),
        };

        let exports = match script.run(scope) {
            Some(val) => val,
            None => return Err(SsrError::InvalidJs("Execute your script with d8 to debug")),
        };

        let object = match exports.to_object(scope) {
            Some(val) => val,
            None => {
                return Err(SsrError::InvalidJs(
                    "The script does not return any object after being executed",
                ))
            }
        };

        let mut fn_map: FxHashMap<String, v8::Local<v8::Function>> = FxHashMap::default();

        if let Some(props) = object.get_own_property_names(scope, Default::default()) {
            // Replaces a `Some(props).iter()...collect()` that iterated the
            // `Option`, not the array, so it only ever registered the first
            // property - fine when there's one export, wrong once `render` looks
            // up entry points by name.
            for i in 0..props.length() {
                let name = match props.get_index(scope, i) {
                    Some(val) => val,
                    None => return Err(SsrError::FailedToParseJs("Failed to get property name")),
                };

                let mut scope = v8::EscapableHandleScope::new(scope);

                let value = match object.get(&mut scope, name) {
                    Some(val) => val,
                    None => {
                        return Err(SsrError::FailedToParseJs("Failed to get property from obj"))
                    }
                };

                if !value.is_function() {
                    continue;
                }

                let fn_name = match name.to_string(&mut scope) {
                    Some(val) => val.to_rust_string_lossy(&mut scope),
                    None => return Err(SsrError::FailedToParseJs("Failed to find function name")),
                };

                fn_map.insert(fn_name, scope.escape(value.cast()));
            }
        }

        Ok(Ssr {
            isolate,
            handle_scope,
            fn_map,
            scope: scope_ptr,
            stream_writer: None,
            // Classic-script (IIFE) bundles have no timers: microtask-only.
            timer_queue: std::ptr::null_mut(),
            decoder_registry,
        })
    }

    /// Build an [`Ssr`] from an **ES module** bundle (vite `format: 'es'`).
    ///
    /// Unlike [`Ssr::from`], which compiles the source as a classic script and
    /// therefore cannot contain top-level `await`, this compiles the source as a
    /// V8 module, evaluates it — pumping microtasks so any top-level `await`
    /// settles — and reads the module's exports. The bundle must be fully
    /// self-contained (no static imports); ossido's SSR bundle is inlined via
    /// vite `noExternal`.
    ///
    /// Named function exports become callable entry points, looked up by name in
    /// [`Ssr::render`] exactly like the script path.
    pub fn from_module(source: String) -> Result<Self, SsrError> {
        // Plain compile (no cache produced or consumed), preserving the
        // pre-code-cache behaviour for existing callers.
        Self::build_module(source, CacheMode::None).map(|build| build.ssr)
    }

    /// Like [`Ssr::from_module`], but produces or consumes a V8 **code cache**
    /// so the parse+compile of a large bundle is paid once rather than per
    /// isolate:
    ///
    /// * `code_cache: None` — compile the source **eagerly** (every function
    ///   body is compiled up front instead of lazily on first call) and
    ///   serialize the bytecode into [`ModuleBuild::produced_cache`]. Eager
    ///   compilation makes the cache complete — a lazy compile would serialize
    ///   stubs for uncalled functions.
    /// * `code_cache: Some(bytes)` — compile consuming a cache previously
    ///   produced from the **same source** on the same V8 version/flags,
    ///   skipping parse+compile. A mismatched cache is never an error: V8
    ///   transparently falls back to compiling from source and this reports
    ///   [`ModuleBuild::cache_rejected`] so the caller can discard the stale
    ///   bytes.
    ///
    /// **The caller owns cache↔source pairing.** V8's own sanity check is
    /// shallow — version tag, flags and source *length* — so a cache produced
    /// from different source of the same length is silently accepted and the
    /// *cached* code runs. Key stored caches by the exact source contents
    /// (hash or equivalent) and never consume a cache that might not match.
    pub fn from_module_with_cache(
        source: String,
        code_cache: Option<&[u8]>,
    ) -> Result<ModuleBuild<'s, 'i>, SsrError> {
        match code_cache {
            Some(bytes) => Self::build_module(source, CacheMode::Consume(bytes)),
            None => Self::build_module(source, CacheMode::Produce),
        }
    }

    /// Shared ES-module build behind [`Ssr::from_module`] /
    /// [`Ssr::from_module_with_cache`]; only the compile step varies by `cache`.
    fn build_module(source: String, cache: CacheMode<'_>) -> Result<ModuleBuild<'s, 'i>, SsrError> {
        let isolate = Box::into_raw(Box::new(v8::Isolate::new(v8::CreateParams::default())));

        let handle_scope = unsafe { Box::into_raw(Box::new(v8::HandleScope::new(&mut *isolate))) };

        let context = unsafe { v8::Context::new(&mut *handle_scope, Default::default()) };

        let scope_ptr =
            unsafe { Box::into_raw(Box::new(v8::ContextScope::new(&mut *handle_scope, context))) };

        let scope = unsafe { &mut *scope_ptr };

        let code = match v8::String::new(scope, &source) {
            Some(val) => val,
            None => return Err(SsrError::InvalidJs("Strings are needed")),
        };

        // A module-flagged origin makes V8 parse `source` as an ES module, which
        // is what enables top-level `await` (and real `export` bindings).
        let resource_name = match v8::String::new(scope, "server-main") {
            Some(val) => val,
            None => return Err(SsrError::InvalidJs("Strings are needed")),
        };
        let origin = v8::ScriptOrigin::new(
            scope,
            resource_name.into(),
            0,     // resource_line_offset
            0,     // resource_column_offset
            false, // resource_is_shared_cross_origin
            0,     // script_id
            None,  // source_map_url
            false, // resource_is_opaque
            false, // is_wasm
            true,  // is_module
            None,  // host_defined_options
        );
        let mut produced_cache: Option<Vec<u8>> = None;
        let mut cache_rejected = false;

        let module = match cache {
            CacheMode::None => {
                let mut module_source = v8::script_compiler::Source::new(code, Some(&origin));
                match v8::script_compiler::compile_module(scope, &mut module_source) {
                    Some(val) => val,
                    None => return Err(SsrError::InvalidJs("Failed to compile the module")),
                }
            }
            CacheMode::Produce => {
                let mut module_source = v8::script_compiler::Source::new(code, Some(&origin));
                let module = match v8::script_compiler::compile_module2(
                    scope,
                    &mut module_source,
                    v8::script_compiler::CompileOptions::EagerCompile,
                    v8::script_compiler::NoCacheReason::NoReason,
                ) {
                    Some(val) => val,
                    None => return Err(SsrError::InvalidJs("Failed to compile the module")),
                };
                // Serialize immediately after the compile, before
                // `instantiate_module` — the point at which the unbound script
                // is complete and untouched by evaluation state (the same
                // ordering deno_core uses). `create_code_cache` returning
                // `None` (unserialisable script) just means no cache.
                produced_cache = module
                    .get_unbound_module_script(scope)
                    .create_code_cache()
                    .map(|data| data.to_vec());
                module
            }
            CacheMode::Consume(bytes) => {
                // `CachedData::new` borrows `bytes` (it does not copy); the
                // borrow is safe here because `bytes` outlives this whole call.
                let cached = v8::script_compiler::CachedData::new(bytes);
                let mut module_source =
                    v8::script_compiler::Source::new_with_cached_data(code, Some(&origin), cached);
                let module = match v8::script_compiler::compile_module2(
                    scope,
                    &mut module_source,
                    v8::script_compiler::CompileOptions::ConsumeCodeCache,
                    v8::script_compiler::NoCacheReason::NoReason,
                ) {
                    Some(val) => val,
                    None => return Err(SsrError::InvalidJs("Failed to compile the module")),
                };
                // A rejected cache is not an error: V8 falls back to a full
                // parse+compile and the module is valid. Report it so the
                // caller can discard the stale bytes.
                cache_rejected = module_source
                    .get_cached_data()
                    .is_none_or(|data| data.rejected());
                module
            }
        };

        // The bundle is inlined, so instantiation resolves no imports.
        if module
            .instantiate_module(scope, no_import_resolve_callback)
            .is_none()
        {
            return Err(SsrError::InvalidJs("Failed to instantiate the module"));
        }

        // Install the native timers before the module runs, so `setTimeout` (and
        // `MessageChannel` delivery, which uses it) is available to the bundle —
        // including at top-level-await time.
        let timer_queue = install_timers(scope, isolate);

        // The registered native globals (text codecs, …) before the bundle
        // runs, so its conditional polyfills keep them (pure-JS codecs are the
        // dominant per-render cost on large documents).
        install_runtime_globals(scope);
        let decoder_registry = install_decoder_registry(isolate);

        // For a module with top-level await, `evaluate` returns a promise that
        // settles when the whole module (including its awaits) is done. Drive
        // that promise with the same micro+macro pump as render — like Deno's
        // event loop drives module evaluation — so a top-level `await` on a
        // timer / `MessageChannel` settles too.
        let eval_result = module.evaluate(scope);
        if let Some(promise) =
            eval_result.and_then(|value| v8::Local::<v8::Promise>::try_from(value).ok())
        {
            pump_until(
                scope,
                || promise.state() == v8::PromiseState::Pending,
                "Module top-level await did not settle: unresolvable async during evaluation",
            )?;
        }

        match module.get_status() {
            v8::ModuleStatus::Evaluated => {}
            v8::ModuleStatus::Errored => {
                let exception = module.get_exception();
                let reason = exception
                    .to_string(scope)
                    .map(|s| s.to_rust_string_lossy(scope))
                    .unwrap_or_else(|| "<module evaluation failed>".to_string());
                return Err(SsrError::JsException(reason));
            }
            _ => return Err(SsrError::InvalidJs("Module did not finish evaluating")),
        }

        // Read the exports from the module namespace object, collecting every
        // exported function as a callable entry point (mirrors `from`).
        let namespace = module.get_module_namespace();
        let object = match namespace.to_object(scope) {
            Some(val) => val,
            None => return Err(SsrError::InvalidJs("The module namespace is not an object")),
        };

        let mut fn_map: FxHashMap<String, v8::Local<v8::Function>> = FxHashMap::default();

        if let Some(props) = object.get_own_property_names(scope, Default::default()) {
            for i in 0..props.length() {
                let name = match props.get_index(scope, i) {
                    Some(val) => val,
                    None => return Err(SsrError::FailedToParseJs("Failed to get property name")),
                };

                let mut scope = v8::EscapableHandleScope::new(scope);

                let value = match object.get(&mut scope, name) {
                    Some(val) => val,
                    None => {
                        return Err(SsrError::FailedToParseJs("Failed to get property from obj"))
                    }
                };

                if !value.is_function() {
                    continue;
                }

                let fn_name = match name.to_string(&mut scope) {
                    Some(val) => val.to_rust_string_lossy(&mut scope),
                    None => return Err(SsrError::FailedToParseJs("Failed to find function name")),
                };

                fn_map.insert(fn_name, scope.escape(value.cast()));
            }
        }

        Ok(ModuleBuild {
            ssr: Ssr {
                isolate,
                handle_scope,
                fn_map,
                scope: scope_ptr,
                stream_writer: None,
                timer_queue,
                decoder_registry,
            },
            produced_cache,
            cache_rejected,
        })
    }

    /// Add a global function to the V8 runtime.
    /// Any function defined here can be executed within any js scope
    pub fn add_global_fn(
        &self,
        name: &'static str,
        callback: impl v8::MapFnTo<v8::FunctionCallback>,
    ) -> Result<(), SsrError> {
        let scope = unsafe { &mut *self.scope };
        let ctx = scope.get_current_context();
        let global = ctx.global(scope);

        let name = match v8::String::new(scope, name) {
            Some(val) => val,
            None => return Err(SsrError::InvalidFunctionName),
        };

        let callback = match v8::Function::new(scope, callback) {
            Some(val) => val,
            None => return Err(SsrError::InvalidFunction),
        };
        global.set(scope, name.into(), callback.into());

        Ok(())
    }

    /// Execute the Javascript functions and return the result as string.
    pub fn render_to_string(&mut self, params: Option<&str>) -> Result<String, SsrError> {
        let scope = unsafe { &mut *self.scope };

        // Clear any macrotasks left by a prior aborted render (isolates are
        // reused across requests in the render pool).
        reset_macrotasks(scope);

        let params: v8::Local<v8::Value> = match v8::String::new(scope, params.unwrap_or("")) {
            Some(s) => s.into(),
            None => v8::undefined(scope).into(),
        };

        let undef = v8::undefined(scope).into();

        let mut rendered = String::new();

        for func in self.fn_map.values() {
            let mut result = match func.call(scope, undef, &[params]) {
                Some(val) => val,
                None => return Err(SsrError::FailedJsExecution("Failed to call function")),
            };

            if result.is_promise() {
                let promise = match v8::Local::<v8::Promise>::try_from(result) {
                    Ok(val) => val,
                    Err(_) => {
                        return Err(SsrError::FailedJsExecution(
                            "Failed to cast main function to promise",
                        ))
                    }
                };

                pump_until(
                    scope,
                    || promise.state() == v8::PromiseState::Pending,
                    "SSR render did not settle: unresolvable async (e.g. a live fetch) during render",
                )?;

                result = promise.result(scope);
            }

            let result = match result.to_string(scope) {
                Some(val) => val,
                None => {
                    return Err(SsrError::FailedJsExecution(
                        "Failed to parse the result to string",
                    ))
                }
            };

            rendered.push_str(&result.to_rust_string_lossy(scope));
        }

        Ok(rendered)
    }

    /// Call a single exported function by name and return its result as a string
    /// (awaiting it if it is async). Unlike [`Ssr::render_to_string`], which
    /// iterates and concatenates every export, this targets one function — so a
    /// bundle can expose several entry points (e.g. a buffered and a streaming
    /// renderer) without them being called together.
    pub fn render(&mut self, entry: &str, params: Option<&str>) -> Result<String, SsrError> {
        let scope = unsafe { &mut *self.scope };

        // Clear any macrotasks left by a prior aborted render (isolates are
        // reused across requests in the render pool).
        reset_macrotasks(scope);

        let func = *self
            .fn_map
            .get(entry)
            .ok_or(SsrError::InvalidFunctionName)?;

        let params: v8::Local<v8::Value> = match v8::String::new(scope, params.unwrap_or("")) {
            Some(s) => s.into(),
            None => v8::undefined(scope).into(),
        };
        let undef = v8::undefined(scope).into();

        let mut result = match func.call(scope, undef, &[params]) {
            Some(val) => val,
            None => return Err(SsrError::FailedJsExecution("Failed to call function")),
        };

        if result.is_promise() {
            let promise = v8::Local::<v8::Promise>::try_from(result)
                .map_err(|_| SsrError::FailedJsExecution("Failed to cast function to promise"))?;

            pump_until(
                scope,
                || promise.state() == v8::PromiseState::Pending,
                "SSR render did not settle: unresolvable async (e.g. a live fetch) during render",
            )?;

            if promise.state() == v8::PromiseState::Rejected {
                return Err(rejection_error(scope, promise));
            }

            result = promise.result(scope);
        }

        let result = result.to_string(scope).ok_or(SsrError::FailedJsExecution(
            "Failed to parse the result to string",
        ))?;

        Ok(result.to_rust_string_lossy(scope))
    }

    /// Opt into streaming rendering. Installs `write_fn` (e.g. `"__ssr_write"`)
    /// as the global a streaming bundle calls to emit each chunk, and returns a
    /// [`Streaming`] handle to drive streaming renders. The buffered `render` /
    /// `render_to_string` API is unaffected — nothing here is installed unless
    /// you call this.
    ///
    /// ```no_run
    /// # use ossido_ssr::Ssr;
    /// # fn f(mut js: Ssr) -> Result<(), ossido_ssr::SsrError> {
    ///     let mut sink = |chunk: &str| print!("{chunk}");
    ///     js.streaming("__ssr_write")?
    ///         .render("renderStream", None, &mut sink)?;
    /// # Ok(()) }
    /// ```
    pub fn streaming(&mut self, write_fn: &'static str) -> Result<Streaming<'_, 's, 'i>, SsrError> {
        // Install the writer global once per isolate — the global persists across
        // renders, so repeated `streaming` calls need not re-allocate it.
        if self.stream_writer != Some(write_fn) {
            self.add_global_fn(write_fn, stream_write_callback)?;
            self.stream_writer = Some(write_fn);
        }
        Ok(Streaming { ssr: self })
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Once;

    use super::*;

    /// A [`StreamSink`] that collects chunks into a `Vec` for assertions. Since
    /// `Streaming::render` only borrows the sink, tests instantiate one locally
    /// and read `chunks` back after the render returns — no `Rc<RefCell<..>>`.
    #[derive(Default)]
    struct Collector {
        chunks: Vec<String>,
    }

    impl StreamSink for Collector {
        fn write_chunk(&mut self, chunk: &str) {
            self.chunks.push(chunk.to_string());
        }
    }

    static INIT: Once = Once::new();

    pub fn init_test() {
        INIT.call_once(|| {
            Ssr::create_platform();
        })
    }

    #[test]
    fn wrong_entry_point() {
        init_test();
        let source = r##"var entryPoint = {x: () => "<html></html>"};"##;

        let res = Ssr::from(source.to_owned(), "IncorrectEntryPoint");

        assert_eq!(
            res.unwrap_err(),
            SsrError::InvalidJs("Execute your script with d8 to debug")
        );
    }

    #[test]
    fn empty_code() {
        init_test();
        let source = r##""##;

        let res = Ssr::from(source.to_owned(), "SSR");
        assert_eq!(
            res.unwrap_err(),
            SsrError::InvalidJs("Execute your script with d8 to debug")
        );
    }

    #[test]
    fn executes_iife_source() {
        init_test();
        let source = r##"(() => ({x: () => 'rendered HTML'}))()"##;

        let mut js = Ssr::from(source.to_owned(), "").unwrap();
        assert_eq!(js.render_to_string(None).unwrap(), "rendered HTML");
    }

    #[test]
    fn pass_param_to_function() {
        init_test();

        let props = r#"{"Hello world"}"#;

        let accept_params_source =
            r##"var SSR = {x: (params) => "These are our parameters: " + params};"##.to_string();

        let mut js = Ssr::from(accept_params_source, "SSR").unwrap();
        println!("Before render_to_string");
        let result = js.render_to_string(Some(props)).unwrap();

        assert_eq!(result, "These are our parameters: {\"Hello world\"}");

        let no_params_source = r##"var SSR = {x: () => "I don't accept params"};"##.to_string();

        let mut js2 = Ssr::from(no_params_source, "SSR").unwrap();
        let result2 = js2.render_to_string(Some(props)).unwrap();

        assert_eq!(result2, "I don't accept params");

        let result3 = js.render_to_string(None).unwrap();

        assert_eq!(result3, "These are our parameters: ");
    }

    #[test]
    fn render_simple_html() {
        init_test();

        let source = r##"var SSR = {x: () => "<html></html>"};"##.to_string();

        let mut js = Ssr::from(source, "SSR").unwrap();
        let html = js.render_to_string(None).unwrap();

        assert_eq!(html, "<html></html>");

        //Prevent missing semicolon
        let source2 = r##"var SSR = {x: () => "<html></html>"}"##.to_string();

        let mut js2 = Ssr::from(source2, "SSR").unwrap();
        let html2 = js2.render_to_string(None).unwrap();

        assert_eq!(html2, "<html></html>");
    }

    #[test]
    fn from_module_exposes_named_exports() {
        init_test();

        let source = r##"export function renderFn() { return "<div></div>"; }"##.to_string();

        let mut js = Ssr::from_module(source).unwrap();
        let html = js.render("renderFn", None).unwrap();

        assert_eq!(html, "<div></div>");
    }

    #[test]
    fn from_module_supports_top_level_await() {
        init_test();

        // A classic script (`Ssr::from`) cannot even parse this source; as a
        // module, the top-level `await` settles via the microtask pump before
        // the exported entry point is read.
        let source = r##"
            const html = await Promise.resolve("<html>hi</html>");
            export function renderFn() {
                return html;
            }
        "##
        .to_string();

        let mut js = Ssr::from_module(source).unwrap();
        let out = js.render("renderFn", None).unwrap();

        assert_eq!(out, "<html>hi</html>");
    }

    /// A minimal `MessageChannel` built on the **native** `setTimeout` (installed
    /// by `install_timers`), for the one test that needs it. Timers themselves
    /// are native now, so the other tests use `setTimeout` directly.
    const MESSAGE_CHANNEL_PRELUDE: &str = r##"
        class __Port {
            postMessage(m) {
                const other = this.other;
                setTimeout(() => { if (other.onmessage) other.onmessage({ data: m }); }, 0);
            }
        }
        globalThis.MessageChannel = class {
            constructor() {
                this.port1 = new __Port();
                this.port2 = new __Port();
                this.port1.other = this.port2;
                this.port2.other = this.port1;
            }
        };
    "##;

    #[test]
    fn render_settles_async_resolved_via_settimeout() {
        init_test();
        // `setTimeout` is a native global; the render pump drains it on a virtual
        // clock (the 50ms delay does not wall-clock-block).
        let source = r##"
            export function renderFn() {
                return new Promise((resolve) => setTimeout(() => resolve("<html>timer</html>"), 50));
            }
        "##
        .to_string();
        let mut js = Ssr::from_module(source).unwrap();
        assert_eq!(js.render("renderFn", None).unwrap(), "<html>timer</html>");
    }

    #[test]
    fn render_settles_async_resolved_via_message_channel() {
        init_test();
        // The MessageChannel path is exactly how React 19's Fizz renderer resumes
        // suspended work; its delivery must be driven by the macrotask drain.
        let source = format!(
            r##"{MESSAGE_CHANNEL_PRELUDE}
            export function renderFn() {{
                return new Promise((resolve) => {{
                    const channel = new MessageChannel();
                    channel.port1.onmessage = () => resolve("<html>channel</html>");
                    channel.port2.postMessage(null);
                }});
            }}
        "##
        );
        let mut js = Ssr::from_module(source).unwrap();
        assert_eq!(js.render("renderFn", None).unwrap(), "<html>channel</html>");
    }

    #[test]
    fn from_module_top_level_await_settles_via_settimeout() {
        init_test();
        let source = r##"
            const html = await new Promise((r) => setTimeout(() => r("<html>tla</html>"), 10));
            export function renderFn() { return html; }
        "##
        .to_string();
        let mut js = Ssr::from_module(source).unwrap();
        assert_eq!(js.render("renderFn", None).unwrap(), "<html>tla</html>");
    }

    #[test]
    fn render_aborts_unresolvable_async_instead_of_hanging() {
        init_test();
        // A promise with no timer to settle it (a real `fetch` behaves this way in
        // the isolate). The bounded guard must abort quickly, not hang.
        let source = r##"
            export function renderFn() { return new Promise(() => {}); }
        "##
        .to_string();
        let mut js = Ssr::from_module(source).unwrap();
        match js.render("renderFn", None) {
            Err(SsrError::FailedJsExecution(msg)) => assert!(msg.contains("did not settle")),
            other => panic!("expected a settle-timeout error, got {other:?}"),
        }
    }

    #[test]
    fn macrotasks_do_not_leak_between_renders() {
        init_test();
        // `first` queues a timer but returns synchronously (never pumped); the
        // start-of-render reset must drop it so `second` sees a clean flag.
        let source = r##"
            globalThis.__leaked = false;
            export function first() {
                setTimeout(() => { globalThis.__leaked = true; }, 1);
                return "<html>first</html>";
            }
            export function second() {
                return new Promise((resolve) =>
                    setTimeout(
                        () => resolve("<html>" + (globalThis.__leaked ? "LEAKED" : "clean") + "</html>"),
                        1,
                    ));
            }
        "##
        .to_string();
        let mut js = Ssr::from_module(source).unwrap();
        assert_eq!(js.render("first", None).unwrap(), "<html>first</html>");
        assert_eq!(js.render("second", None).unwrap(), "<html>clean</html>");
    }

    #[test]
    fn code_cache_round_trip_renders_identically() {
        init_test();

        let source = r##"
            const prefix = "<html>";
            export function renderFn(payload) { return prefix + (payload || "empty") + "</html>"; }
        "##
        .to_string();

        // Produce: eager compile serializes a cache.
        let produced = Ssr::from_module_with_cache(source.clone(), None).unwrap();
        assert!(!produced.cache_rejected);
        let cache = produced
            .produced_cache
            .expect("eager compile should produce a code cache");
        assert!(!cache.is_empty());
        let mut cold = produced.ssr;

        // Consume: same source + fresh cache must be accepted, not re-produced.
        let consumed = Ssr::from_module_with_cache(source, Some(&cache)).unwrap();
        assert!(!consumed.cache_rejected, "fresh cache must not be rejected");
        assert!(consumed.produced_cache.is_none());
        let mut warm = consumed.ssr;

        // Isolates are dropped in reverse creation order (`warm` then `cold`)
        // as rusty_v8 requires — reverse declaration order does that here.
        assert_eq!(
            warm.render("renderFn", Some("X")).unwrap(),
            cold.render("renderFn", Some("X")).unwrap(),
        );
        assert_eq!(warm.render("renderFn", None).unwrap(), "<html>empty</html>");
    }

    #[test]
    fn garbage_code_cache_is_rejected_but_still_renders() {
        init_test();

        let source = r##"export function renderFn() { return "<html>ok</html>"; }"##;
        let garbage = vec![0xA5u8; 128];

        let build = Ssr::from_module_with_cache(source.to_string(), Some(&garbage)).unwrap();
        assert!(build.cache_rejected, "garbage bytes must be rejected");
        assert!(build.produced_cache.is_none());

        // Rejection is transparent: V8 recompiled from source and the isolate works.
        let mut ssr = build.ssr;
        assert_eq!(ssr.render("renderFn", None).unwrap(), "<html>ok</html>");
    }

    #[test]
    fn mismatched_source_code_cache_is_rejected_but_still_renders() {
        init_test();

        // V8's sanity check only compares source LENGTH (plus version/flags) —
        // a same-length different source would be silently accepted, which is
        // why callers must key caches by source contents (see the
        // `from_module_with_cache` docs). Different lengths ARE detected.
        let source_a = r##"export function renderFn() { return "<html>A</html>"; }"##.to_string();
        let source_b =
            r##"export function renderFn() { return "<html>BBBB</html>"; }"##.to_string();

        let produced = Ssr::from_module_with_cache(source_a, None).unwrap();
        let cache = produced.produced_cache.expect("cache should be produced");
        drop(produced.ssr);

        // A different-length source must reject the cache — and the render
        // must reflect the *supplied* source, not the cached one.
        let build = Ssr::from_module_with_cache(source_b, Some(&cache)).unwrap();
        assert!(build.cache_rejected);
        let mut ssr = build.ssr;
        assert_eq!(ssr.render("renderFn", None).unwrap(), "<html>BBBB</html>");
    }

    #[test]
    fn native_text_codecs_round_trip() {
        init_test();

        let source = r##"
            export function renderFn() {
                const encoder = new TextEncoder();
                const decoder = new TextDecoder();
                const input = "héllo wörld — 日本語 🎉";
                const bytes = encoder.encode(input);
                const roundTrip = decoder.decode(bytes);
                // A subarray view must decode through its window, not the
                // whole buffer ("h" is 1 byte, so [1..] starts at "é").
                const tail = decoder.decode(bytes.subarray(1));
                const checks = [
                    roundTrip === input,
                    decoder.decode(bytes.buffer) === input,
                    input.startsWith("h") && ("h" + tail) === input,
                    encoder.encode("").length === 0,
                    decoder.decode(new Uint8Array(0)) === "",
                    new TextEncoder().encoding === "utf-8",
                ];
                return checks.every(Boolean) ? "ok" : "FAIL:" + JSON.stringify(checks);
            }
        "##
        .to_string();

        let mut js = Ssr::from_module(source).unwrap();
        assert_eq!(js.render("renderFn", None).unwrap(), "ok");
    }

    #[test]
    fn native_text_codecs_survive_conditional_polyfills() {
        init_test();

        // The polyfill guard pattern every bundle uses: an existing global wins.
        let source = r##"
            const scope = globalThis;
            const before = scope.TextEncoder;
            scope.TextEncoder = scope.TextEncoder || function Polyfill() {};
            export function renderFn() {
                return scope.TextEncoder === before ? "native kept" : "clobbered";
            }
        "##
        .to_string();

        let mut js = Ssr::from_module(source).unwrap();
        assert_eq!(js.render("renderFn", None).unwrap(), "native kept");
    }

    /// Run a JS snippet that returns an array of `[label, boolean]` check
    /// pairs (or a promise of one — the render pump drives it) and assert
    /// every check passed, reporting the failed labels.
    fn assert_js_checks(body: &str) {
        init_test();
        let source = format!(
            r#"export async function renderFn() {{
                const checks = await (() => {{ {body} }})();
                const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
                return failed.length === 0 ? "ok" : "FAILED: " + failed.join(", ");
            }}"#
        );
        let mut js = Ssr::from_module(source).unwrap();
        assert_eq!(js.render("renderFn", None).unwrap(), "ok");
    }

    #[test]
    fn text_encoder_encode_into() {
        assert_js_checks(
            r#"
            const enc = new TextEncoder();

            // Plenty of room: everything encodes; read counts UTF-16 units.
            const big = new Uint8Array(64);
            const a = enc.encodeInto("héllo", big);

            // Surrogate pair: 🎉 is 2 UTF-16 units, 4 UTF-8 bytes.
            const pair = new Uint8Array(8);
            const b = enc.encodeInto("🎉", pair);

            // Truncation never splits a code point: é needs 2 bytes; with only
            // 1 byte left after "h", it must stop after "h".
            const tight = new Uint8Array(2);
            const c = enc.encodeInto("hé", tight);

            // The written window lands at the view's offset.
            const backing = new Uint8Array(8);
            const offset = new Uint8Array(backing.buffer, 4, 4);
            const d = enc.encodeInto("hi", offset);

            return [
              ["read counts units", a.read === 5],
              ["written utf8 bytes", a.written === 6],
              ["pair read", b.read === 2],
              ["pair written", b.written === 4],
              ["no split write", c.written === 1],
              ["no split read", c.read === 1],
              ["offset write", d.written === 2 && backing[4] === 104 && backing[5] === 105],
              ["offset untouched", backing[0] === 0],
            ];
            "#,
        );
    }

    #[test]
    fn text_decoder_supports_whatwg_labels() {
        assert_js_checks(
            r#"
            // latin1 is a windows-1252 label per the Encoding Standard, and the
            // 0x80–0x9F range must decode via the windows-1252 table (€ at 0x80),
            // NOT as ISO-8859-1 control characters.
            const cp1252 = new TextDecoder("latin1");
            const euro = cp1252.decode(new Uint8Array([0x80]));

            // windows-1251 (Cyrillic): "Привет" one byte per letter.
            const cyrillic = new TextDecoder("windows-1251")
              .decode(new Uint8Array([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]));

            // utf-16le with its BOM consumed by default.
            const utf16 = new TextDecoder("utf-16le")
              .decode(new Uint8Array([0xff, 0xfe, 0x68, 0x00, 0x69, 0x00]));

            // shift_jis: "日本" as 2-byte sequences.
            const sjis = new TextDecoder("shift_jis")
              .decode(new Uint8Array([0x93, 0xfa, 0x96, 0x7b]));

            let unknownLabelThrows = false;
            try { new TextDecoder("not-a-real-encoding"); }
            catch (e) { unknownLabelThrows = e instanceof RangeError; }

            return [
              ["canonical name", cp1252.encoding === "windows-1252"],
              ["cp1252 euro", euro === "€"],
              ["windows-1251", cyrillic === "Привет"],
              ["utf-16le", utf16 === "hi"],
              ["shift_jis", sjis === "日本"],
              ["unknown label RangeError", unknownLabelThrows],
            ];
            "#,
        );
    }

    #[test]
    fn text_decoder_fatal_and_bom() {
        assert_js_checks(
            r#"
            const invalid = new Uint8Array([0x68, 0xff, 0x69]); // h <bad> i

            // Non-fatal: U+FFFD replacement.
            const lossy = new TextDecoder().decode(invalid);

            // Fatal: TypeError.
            let fatalThrows = false;
            try { new TextDecoder("utf-8", { fatal: true }).decode(invalid); }
            catch (e) { fatalThrows = e instanceof TypeError; }

            // BOM removed by default, preserved with ignoreBOM.
            const withBom = new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69]);
            const stripped = new TextDecoder().decode(withBom);
            const kept = new TextDecoder("utf-8", { ignoreBOM: true }).decode(withBom);

            const flags = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

            return [
              ["lossy replacement", lossy === "h�i"],
              ["fatal TypeError", fatalThrows],
              ["bom stripped", stripped === "hi"],
              ["bom kept", kept === "﻿hi"],
              ["fatal getter", flags.fatal === true],
              ["ignoreBOM getter", flags.ignoreBOM === true],
            ];
            "#,
        );
    }

    #[test]
    fn text_decoder_streams_across_chunk_boundaries() {
        assert_js_checks(
            r#"
            // 🎉 (4 UTF-8 bytes) split across three stream chunks.
            const bytes = new TextEncoder().encode("a🎉b");
            const dec = new TextDecoder();
            let out = "";
            out += dec.decode(bytes.subarray(0, 2), { stream: true });
            out += dec.decode(bytes.subarray(2, 4), { stream: true });
            out += dec.decode(bytes.subarray(4));

            // A dangling partial sequence at end-of-stream becomes U+FFFD…
            const dangling = new TextDecoder();
            let d = dangling.decode(new Uint8Array([0xe6, 0x97]), { stream: true });
            d += dangling.decode();

            // …and throws in fatal mode.
            const fatal = new TextDecoder("utf-8", { fatal: true });
            fatal.decode(new Uint8Array([0xe6, 0x97]), { stream: true });
            let eofThrows = false;
            try { fatal.decode(); } catch (e) { eofThrows = e instanceof TypeError; }

            // The instance is reusable for a fresh stream afterwards.
            const reuse = dec.decode(new TextEncoder().encode("again"));

            // Streaming BOM handling: BOM split across chunks still stripped.
            const bomStream = new TextDecoder();
            let s = bomStream.decode(new Uint8Array([0xef, 0xbb]), { stream: true });
            s += bomStream.decode(new Uint8Array([0xbf, 0x68]), { stream: true });
            s += bomStream.decode();

            return [
              ["split code point", out === "a\u{1f389}b"],
              ["dangling replaced", d === "�"],
              ["dangling fatal throws", eofThrows],
              ["decoder reusable", reuse === "again"],
              ["streamed bom stripped", s === "h"],
            ];
            "#,
        );
    }

    #[test]
    fn native_message_channel_delivers_asynchronously() {
        assert_js_checks(
            r#"
            // The exact shape React's Fizz renderer relies on: postMessage on
            // one port, delivery on the other via a macrotask, never
            // synchronously.
            return new Promise((resolve) => {
                const order = [];
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => {
                    order.push("delivered:" + event.data);
                    resolve([
                        ["macrotask ordering", order.join(",") === "posted,delivered:42"],
                        ["MessageEvent", event instanceof MessageEvent && event instanceof Event],
                        ["event type", event.type === "message"],
                        ["event target", event.target === channel.port1],
                    ]);
                };
                channel.port2.postMessage(42);
                order.push("posted");
            });
            "#,
        );
    }

    #[test]
    fn native_message_channel_listeners_and_close() {
        assert_js_checks(
            r#"
            return new Promise((resolve) => {
                const channel = new MessageChannel();
                let viaListener = null;
                channel.port1.addEventListener("message", (e) => { viaListener = e.data; });

                const closed = new MessageChannel();
                let closedDelivered = false;
                closed.port1.onmessage = () => { closedDelivered = true; };
                closed.port1.close();
                closed.port2.postMessage("dropped");

                channel.port2.postMessage("x");
                setTimeout(() => {
                    resolve([
                        ["addEventListener delivery", viaListener === "x"],
                        ["closed port drops", closedDelivered === false],
                    ]);
                }, 1);
            });
            "#,
        );
    }

    #[test]
    fn native_url_search_params() {
        assert_js_checks(
            r#"
            // Constructor forms.
            const fromString = new URLSearchParams("?a=1&b=two%20words&a=3&plus=a+b");
            const fromPairs = new URLSearchParams([["k", "v"], ["k", "w"]]);
            const fromRecord = new URLSearchParams({ x: "1", y: "2" });
            const fromCopy = new URLSearchParams(fromPairs);
            fromCopy.append("k", "z");

            // Mutation semantics: set replaces the first entry in place and
            // drops the rest; delete/has accept a value filter.
            const mutate = new URLSearchParams("a=1&b=2&a=3");
            mutate.set("a", "9");
            const setShape = mutate.toString();
            mutate.delete("b", "nope");
            const valueFilteredKept = mutate.has("b");
            mutate.delete("b", "2");

            const sorted = new URLSearchParams("c=3&a=1&b=2&a=0");
            sorted.sort();

            let iterated = "";
            for (const [k, v] of fromString) iterated += k + "=" + v + ";";

            return [
                ["get", fromString.get("a") === "1"],
                ["getAll", fromString.getAll("a").join(",") === "1,3"],
                ["percent decode", fromString.get("b") === "two words"],
                ["plus is space", fromString.get("plus") === "a b"],
                ["missing is null", fromString.get("nope") === null],
                ["pairs init", fromPairs.getAll("k").join(",") === "v,w"],
                ["record init", fromRecord.toString() === "x=1&y=2"],
                ["copy is a copy", fromCopy.size === 3 && fromPairs.size === 2],
                ["set in place", setShape === "a=9&b=2"],
                ["delete value filter", valueFilteredKept === true && !mutate.has("b")],
                ["stable sort", sorted.toString() === "a=1&a=0&b=2&c=3"],
                ["iteration", iterated === "a=1;b=two words;a=3;plus=a b;"],
                ["size", fromString.size === 4],
                ["serialize escapes", new URLSearchParams([["a b", "c&d"]]).toString() === "a+b=c%26d"],
                ["round trip", new URLSearchParams(fromString.toString()).get("b") === "two words"],
            ];
            "#,
        );
    }

    #[test]
    fn native_queue_microtask_and_global_alias() {
        assert_js_checks(
            r#"
            return new Promise((resolve) => {
                const order = [];
                queueMicrotask(() => order.push("micro"));
                order.push("sync");
                setTimeout(() => {
                    let typeErrorThrown = false;
                    try { queueMicrotask(null); } catch (e) { typeErrorThrown = e instanceof TypeError; }
                    resolve([
                        // Microtasks run after sync code, before macrotasks.
                        ["ordering", order.join(",") === "sync,micro"],
                        ["non-callable throws", typeErrorThrown],
                        ["global alias", global === globalThis],
                    ]);
                }, 0);
            });
            "#,
        );
    }

    #[test]
    fn from_module_surfaces_top_level_evaluation_errors() {
        init_test();

        let source = r##"
            throw new Error("boom at top level");
            export function renderFn() { return ""; }
        "##
        .to_string();

        let err = Ssr::from_module(source).unwrap_err();
        match err {
            SsrError::JsException(reason) => assert!(reason.contains("boom at top level")),
            other => panic!("expected JsException, got {other:?}"),
        }
    }

    #[test]
    fn render_from_struct_instance() {
        init_test();

        let mut js = Ssr::from(
            r##"var SSR = {x: () => "<html></html>"};"##.to_string(),
            "SSR",
        )
        .unwrap();

        assert_eq!(js.render_to_string(None).unwrap(), "<html></html>");
        assert_eq!(
            js.render_to_string(Some(r#"{"Hello world"}"#)).unwrap(),
            "<html></html>"
        );

        let mut js2 = Ssr::from(
            r##"var SSR = {x: () => "I don't accept params"};"##.to_string(),
            "SSR",
        )
        .unwrap();

        assert_eq!(js2.render_to_string(None).unwrap(), "I don't accept params");
    }

    #[test]
    fn entry_point_is_async() {
        init_test();

        let mut js = Ssr::from(
            r##"var SSR = {x: async () => "<html></html>"};"##.to_string(),
            "SSR",
        )
        .unwrap();

        assert_eq!(js.render_to_string(None).unwrap(), "<html></html>");
        assert_eq!(
            js.render_to_string(Some(r#"{"Hello world"}"#)).unwrap(),
            "<html></html>"
        );
    }

    #[test]
    fn entry_point_is_async_with_params() {
        init_test();

        let mut js = Ssr::from(
            r##"var SSR = {x: async (params) => "These are our parameters: " + params};"##
                .to_string(),
            "SSR",
        )
        .unwrap();

        assert_eq!(
            js.render_to_string(Some(r#"{"Hello world"}"#)).unwrap(),
            "These are our parameters: {\"Hello world\"}"
        );
    }

    #[test]
    fn entry_point_is_async_with_nested_async() {
        init_test();

        let mut js = Ssr::from(
            r##"
            const asyncFn = async () => {
                return "Hello world"
            }
            var SSR = {x: async () => {
                return await asyncFn()
            }};
            "##
            .to_string(),
            "SSR",
        )
        .unwrap();

        assert_eq!(
            js.render_to_string(Some(r#"{"Hello world"}"#)).unwrap(),
            "Hello world"
        );
    }

    #[test]
    #[should_panic(expected = "FailedJsExecution")]
    fn it_should_fail_to_call_missing_global_fn() {
        init_test();

        let mut js = Ssr::from(
            r##"var testGlobalFn = { globalSumFnCall: () => globalSum(2, 5)};"##.to_string(),
            "testGlobalFn",
        )
        .unwrap();

        assert_eq!(js.render_to_string(None).unwrap(), "7");
    }

    #[test]
    fn it_should_call_a_custom_global_fn() {
        init_test();

        let mut js = Ssr::from(
            r##"var testGlobalFn = { globalSumFnCall: () => globalSum(2, 5)};"##.to_string(),
            "testGlobalFn",
        )
        .unwrap();

        let global_sum = |scope: &mut v8::HandleScope,
                          args: v8::FunctionCallbackArguments,
                          mut rv: v8::ReturnValue| {
            let first = args.get(0).number_value(scope).unwrap();
            let second = args.get(1).number_value(scope).unwrap();
            let sum = first + second;
            rv.set(v8::Number::new(scope, sum).into());
        };

        js.add_global_fn("globalSum", global_sum)
            .expect("Failed to bind global_sum fn");

        assert_eq!(js.render_to_string(None).unwrap(), "7");
    }

    #[test]
    fn render_targets_a_single_named_export() {
        init_test();

        let mut js = Ssr::from(
            r##"var SSR = { renderFn: () => "<html></html>", other: () => "SHOULD NOT APPEAR" };"##
                .to_string(),
            "SSR",
        )
        .unwrap();

        // Only the requested export is called (not every property, unlike
        // `render_to_string`).
        assert_eq!(js.render("renderFn", None).unwrap(), "<html></html>");
        assert_eq!(js.render("other", None).unwrap(), "SHOULD NOT APPEAR");
    }

    #[test]
    fn render_errors_on_unknown_export() {
        init_test();

        let mut js = Ssr::from(
            r##"var SSR = { renderFn: () => "<html></html>" };"##.to_string(),
            "SSR",
        )
        .unwrap();

        assert_eq!(
            js.render("missing", None).unwrap_err(),
            SsrError::InvalidFunctionName
        );
    }

    #[test]
    fn render_surfaces_a_rejected_promise() {
        init_test();

        let mut js = Ssr::from(
            r##"var SSR = { renderFn: async () => { throw new Error("boom"); } };"##.to_string(),
            "SSR",
        )
        .unwrap();

        // A rejected async render surfaces the JS error, not an opaque message.
        match js.render("renderFn", None).unwrap_err() {
            SsrError::JsException(reason) => assert!(
                reason.contains("boom"),
                "expected the JS error in the reason, got: {reason}"
            ),
            other => panic!("expected SsrError::JsException, got {other:?}"),
        }
    }

    #[test]
    fn streaming_emits_chunks_in_order_with_params() {
        init_test();

        let mut js = Ssr::from(
            r##"var SSR = { renderStreamFn: async (params) => {
                __ssr_write("<html>");
                __ssr_write(params || "");
                __ssr_write("</html>");
            }};"##
                .to_string(),
            "SSR",
        )
        .unwrap();

        let mut sink = Collector::default();
        js.streaming("__ssr_write")
            .unwrap()
            .render("renderStreamFn", Some("BODY"), &mut sink)
            .unwrap();

        assert_eq!(sink.chunks, vec!["<html>", "BODY", "</html>"]);
    }

    #[test]
    fn streaming_captures_chunks_across_await_points() {
        init_test();

        // Emitting before and after an `await` proves the microtask pump drives
        // the sink progressively, not just at the end.
        let mut js = Ssr::from(
            r##"var SSR = { renderStreamFn: async () => {
                __ssr_write("a");
                await Promise.resolve();
                __ssr_write("b");
                await Promise.resolve();
                __ssr_write("c");
            }};"##
                .to_string(),
            "SSR",
        )
        .unwrap();

        let mut sink = Collector::default();
        js.streaming("__ssr_write")
            .unwrap()
            .render("renderStreamFn", None, &mut sink)
            .unwrap();

        assert_eq!(sink.chunks, vec!["a", "b", "c"]);
    }

    #[test]
    fn streaming_surfaces_a_rejected_promise() {
        init_test();

        let mut js = Ssr::from(
            r##"var SSR = { renderStreamFn: async () => {
                __ssr_write("partial");
                throw new Error("boom");
            }};"##
                .to_string(),
            "SSR",
        )
        .unwrap();

        let mut sink = Collector::default();
        let result = js
            .streaming("__ssr_write")
            .unwrap()
            .render("renderStreamFn", None, &mut sink);

        // Chunks emitted before the rejection are still delivered...
        assert_eq!(sink.chunks, vec!["partial"]);
        // ...and the rejection reason is surfaced, not swallowed.
        match result.unwrap_err() {
            SsrError::JsException(reason) => assert!(
                reason.contains("boom"),
                "expected the JS error in the reason, got: {reason}"
            ),
            other => panic!("expected SsrError::JsException, got {other:?}"),
        }
    }

    #[test]
    fn buffered_render_after_streaming_is_unaffected() {
        init_test();

        let mut js = Ssr::from(
            r##"var SSR = {
                renderStreamFn: async () => { __ssr_write("streamed"); },
                renderFn: () => "buffered",
            };"##
                .to_string(),
            "SSR",
        )
        .unwrap();

        let mut sink = Collector::default();
        js.streaming("__ssr_write")
            .unwrap()
            .render("renderStreamFn", None, &mut sink)
            .unwrap();
        assert_eq!(sink.chunks, vec!["streamed"]);

        // The sink is cleared after the streaming render, so a later buffered
        // render on the same isolate is unaffected.
        assert_eq!(js.render("renderFn", None).unwrap(), "buffered");
    }

    #[test]
    fn streaming_sink_can_borrow_local_state() {
        init_test();

        let mut js = Ssr::from(
            r##"var SSR = { renderStreamFn: async () => {
                __ssr_write("x");
                __ssr_write("y");
                __ssr_write("z");
            }};"##
                .to_string(),
            "SSR",
        )
        .unwrap();

        // The whole point of lending the sink: it can mutate borrowed local
        // state directly — no `Rc<RefCell<..>>`, no `'static`. A closure that
        // captures two separate locals by `&mut` could not exist under the old
        // owned-`'static` sink.
        let mut count = 0usize;
        let mut buf = String::new();
        {
            let mut sink = |chunk: &str| {
                count += 1;
                buf.push_str(chunk);
            };
            js.streaming("__ssr_write")
                .unwrap()
                .render("renderStreamFn", None, &mut sink)
                .unwrap();
        }

        assert_eq!(count, 3);
        assert_eq!(buf, "xyz");
    }

    #[test]
    fn nested_streaming_across_isolates_preserves_each_sink() {
        init_test();

        // Outer isolate emits a marker mid-stream; the inner isolate is driven
        // to completion from *inside* the outer sink, so both renders are live
        // at once and each installs its own slot. This exercises the nested
        // save/restore (innermost render restored first): after the nested
        // render returns, the outer sink must still receive the trailing chunk.
        let mut outer = Ssr::from(
            r##"var SSR = { renderStreamFn: async () => {
                __ssr_write("A1");
                __ssr_write("<nested>");
                __ssr_write("A2");
            }};"##
                .to_string(),
            "SSR",
        )
        .unwrap();

        let mut inner = Ssr::from(
            r##"var SSR = { renderStreamFn: async () => {
                __ssr_write("B1");
                __ssr_write("B2");
            }};"##
                .to_string(),
            "SSR",
        )
        .unwrap();

        let mut collected: Vec<String> = Vec::new();
        {
            let inner = &mut inner;
            let mut sink = |chunk: &str| {
                if chunk == "<nested>" {
                    let mut nested = Collector::default();
                    inner
                        .streaming("__ssr_write")
                        .unwrap()
                        .render("renderStreamFn", None, &mut nested)
                        .unwrap();
                    collected.extend(nested.chunks);
                } else {
                    collected.push(chunk.to_string());
                }
            };
            outer
                .streaming("__ssr_write")
                .unwrap()
                .render("renderStreamFn", None, &mut sink)
                .unwrap();
        }

        // "A2" arriving after the inner "B1"/"B2" proves the outer slot survived
        // the nested render intact.
        assert_eq!(collected, vec!["A1", "B1", "B2", "A2"]);
    }
}
