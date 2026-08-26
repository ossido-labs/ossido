//! Native `TextEncoder` / `TextDecoder` for the SSR runtime.
//!
//! React's edge builds byte-encode every chunk they emit and ossido's buffered
//! render decodes the whole document back, so on large pages the text codecs
//! are the single hottest boundary after the render itself. Pure-JS polyfills
//! (`fast-text-encoding`) cost milliseconds per megabyte here — they are
//! native-speed on Node only because of a hidden `Buffer` fast path that a
//! bare V8 isolate does not have.
//!
//! The design borrows deliberately from Bun 1.4's Rust implementation
//! (`src/runtime/webcore/TextEncoder.rs` / `TextDecoder.rs`):
//!
//! * **Encoder**: a namespace of native functions, writing into
//!   *uninitialized* output buffers (no zero-fill) via V8's own UTF-8 writer.
//!   `encodeInto` writes `{read, written}` through a reusable scratch
//!   `Uint32Array` instead of allocating a result object per call.
//! * **Decoder**: fast paths first — already-valid UTF-8 goes straight into a
//!   V8 string with no intermediate transcode (SIMD-validated via `simdutf8`),
//!   ASCII windows-1252 goes through the one-byte constructor — and
//!   *everything else* (the full WHATWG label set: `windows-125x`,
//!   `iso-8859-x`, `shift_jis`, `utf-16le/be`, …) through `encoding_rs`,
//!   Firefox's Encoding Standard implementation.
//! * **Streaming**: `decode(chunk, {stream: true})` is backed by a real
//!   per-instance `encoding_rs::Decoder` (correct partial-sequence and BOM
//!   carry for every encoding), held in a registry on the isolate. The state
//!   is freed eagerly when a stream finishes (the spec's end-of-stream decode)
//!   and a decoder that errors in `fatal` mode is discarded, matching Bun.
//!
//! The JS classes over these natives live in [`TEXT_CODEC_BOOTSTRAP`] and are
//! installed before any bundle evaluates, so the conditional polyfills bundles
//! ship (`scope.TextEncoder = scope.TextEncoder || …`) keep the natives.

use std::collections::HashMap;
use std::ffi::c_void;

/// Isolate data slot holding the pointer to this isolate's
/// [`DecoderRegistry`] (slot 0 = stream sink, slot 1 = timer queue).
pub(crate) const DECODER_SLOT: u32 = 2;

/// One live streaming decoder (`TextDecoder` used with `{stream: true}`).
struct StreamingDecoder {
    decoder: encoding_rs::Decoder,
    fatal: bool,
}

/// The isolate's streaming decoders, keyed by the id handed to JS. Owned
/// (boxed) by the [`crate::Ssr`]; a raw pointer lives in [`DECODER_SLOT`] so
/// the native callbacks can reach it — the same ownership shape as the timer
/// queue.
#[derive(Default)]
pub(crate) struct DecoderRegistry {
    decoders: HashMap<u32, StreamingDecoder>,
    next_id: u32,
}

impl DecoderRegistry {
    /// Live streaming decoders. Used as a snapshottability gate: a mid-stream
    /// `TextDecoder`'s carry state lives in this Rust registry, which a heap
    /// snapshot cannot capture — the restored JS object would hold a dangling
    /// stream id — so a non-empty registry refuses the snapshot.
    pub(crate) fn active(&self) -> usize {
        self.decoders.len()
    }
}

/// Install the registry on the isolate; the returned pointer is owned by the
/// [`crate::Ssr`] and must be freed (via `Box::from_raw`) before the isolate.
pub(crate) fn install_decoder_registry(isolate: &mut v8::Isolate) -> *mut DecoderRegistry {
    let registry = Box::into_raw(Box::new(DecoderRegistry::default()));
    isolate.set_data(DECODER_SLOT, registry as *mut c_void);
    registry
}

/// Streaming decoders still open on this isolate (0 when no registry is
/// installed). See [`DecoderRegistry::active`].
pub(crate) fn active_decoders(scope: &mut v8::HandleScope) -> usize {
    decoder_registry(scope).map_or(0, |registry| registry.active())
}

/// Borrow the isolate's [`DecoderRegistry`] via [`DECODER_SLOT`], if installed.
fn decoder_registry<'a>(scope: &mut v8::HandleScope) -> Option<&'a mut DecoderRegistry> {
    let ptr = scope.get_data(DECODER_SLOT) as *mut DecoderRegistry;
    if ptr.is_null() {
        None
    } else {
        // Safety: the pointer is the address of the `Box<DecoderRegistry>` the
        // `Ssr` owns for this isolate's lifetime; single-threaded, cleared in
        // `Drop` before the isolate is freed.
        Some(unsafe { &mut *ptr })
    }
}

pub(crate) fn throw_type_error(scope: &mut v8::HandleScope, message: &str) {
    if let Some(message) = v8::String::new(scope, message) {
        let exception = v8::Exception::type_error(scope, message);
        scope.throw_exception(exception);
    }
}

/// Borrow the bytes of an `ArrayBufferView` (respecting its window) or a whole
/// `ArrayBuffer` argument, without copying.
///
/// Safety: the returned slice aliases the buffer's backing store. It is valid
/// only while no JS runs and the buffer is not detached — callers must consume
/// it before returning to JS and must not call back into the engine while
/// holding it (we only read it into the decoder / a fresh V8 string).
fn bytes_of<'a>(scope: &mut v8::HandleScope, value: v8::Local<v8::Value>) -> Option<&'a [u8]> {
    if let Ok(view) = v8::Local::<v8::ArrayBufferView>::try_from(value) {
        let buffer = view.buffer(scope)?;
        let store = buffer.get_backing_store();
        let len = view.byte_length();
        let base = match store.data() {
            // A zero-length view over an empty buffer has no data pointer.
            None => return Some(&[]),
            Some(data) => data.as_ptr() as *const u8,
        };
        let offset = view.byte_offset();
        return Some(unsafe { std::slice::from_raw_parts(base.add(offset), len) });
    }
    if let Ok(buffer) = v8::Local::<v8::ArrayBuffer>::try_from(value) {
        let store = buffer.get_backing_store();
        let len = store.byte_length();
        let base = match store.data() {
            Some(data) => data.as_ptr() as *const u8,
            // A zero-length ArrayBuffer can have no data pointer.
            None => return Some(&[]),
        };
        return Some(unsafe { std::slice::from_raw_parts(base, len) });
    }
    None
}

/// Build a `Uint8Array` from `bytes` without an extra copy (the `Vec` becomes
/// the backing store).
fn uint8_array_from_vec<'s>(
    scope: &mut v8::HandleScope<'s>,
    bytes: Vec<u8>,
) -> Option<v8::Local<'s, v8::Uint8Array>> {
    let len = bytes.len();
    let store = v8::ArrayBuffer::new_backing_store_from_vec(bytes).make_shared();
    let buffer = v8::ArrayBuffer::with_backing_store(scope, &store);
    v8::Uint8Array::new(scope, buffer, 0, len)
}

// --- TextEncoder ---------------------------------------------------------

/// `__ossido_encode_utf8(string) -> Uint8Array`
///
/// V8 writes the UTF-8 bytes directly into an *uninitialized* buffer sized by
/// `utf8_length` — no zero-fill, no transcoding round-trip. Lone surrogates
/// become U+FFFD (the spec's USVString conversion).
pub(crate) fn encode_utf8_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let Some(string) = args.get(0).to_string(scope) else {
        return;
    };
    let len = string.utf8_length(scope);
    let mut bytes: Vec<u8> = Vec::with_capacity(len);
    let written = string.write_utf8_uninit_v2(
        scope,
        &mut bytes.spare_capacity_mut()[..len],
        v8::WriteFlags::kReplaceInvalidUtf8,
        None,
    );
    // Safety: V8 initialized exactly `written` bytes of the spare capacity.
    unsafe { bytes.set_len(written) };
    if let Some(array) = uint8_array_from_vec(scope, bytes) {
        rv.set(array.into());
    }
}

/// `__ossido_encode_into(string, destUint8Array, scratchUint32Array)`
///
/// Encodes as much of `string` as fits into `dest` (never splitting a code
/// point) and reports through `scratch`: `scratch[0]` = UTF-16 code units
/// read, `scratch[1]` = bytes written. The scratch array is allocated once by
/// the bootstrap, so a hot `encodeInto` loop allocates nothing per call.
pub(crate) fn encode_into_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let Some(string) = args.get(0).to_string(scope) else {
        return;
    };
    let Ok(dest) = v8::Local::<v8::ArrayBufferView>::try_from(args.get(1)) else {
        throw_type_error(scope, "encodeInto: destination must be a Uint8Array");
        return;
    };
    let Ok(scratch) = v8::Local::<v8::ArrayBufferView>::try_from(args.get(2)) else {
        return;
    };

    let mut read = 0usize;
    let written = {
        let Some(buffer) = dest.buffer(scope) else {
            return;
        };
        let store = buffer.get_backing_store();
        let len = dest.byte_length();
        let written = match store.data() {
            Some(data) => {
                let base = data.as_ptr() as *mut std::mem::MaybeUninit<u8>;
                // Safety: a live, attached view's window is valid writable
                // memory for the duration of this call; V8 does not move
                // ArrayBuffer backing stores.
                let window =
                    unsafe { std::slice::from_raw_parts_mut(base.add(dest.byte_offset()), len) };
                string.write_utf8_uninit_v2(
                    scope,
                    window,
                    v8::WriteFlags::kReplaceInvalidUtf8,
                    Some(&mut read),
                )
            }
            None => 0,
        };
        written
    };

    // Report through the scratch array: [read, written].
    let Some(buffer) = scratch.buffer(scope) else {
        return;
    };
    let store = buffer.get_backing_store();
    if let Some(data) = store.data() {
        if scratch.byte_length() >= 8 {
            let base = data.as_ptr() as *mut u8;
            // Safety: same as above; the bootstrap owns this 2-element array.
            let out = unsafe {
                std::slice::from_raw_parts_mut(base.add(scratch.byte_offset()) as *mut u32, 2)
            };
            out[0] = read as u32;
            out[1] = written as u32;
        }
    }
}

// --- encodeInto fast path -------------------------------------------------

/// Marshal a one-byte (latin1) V8 string into an owned Rust `String`. Shared
/// by the fast-call paths, which receive raw latin1 bytes rather than a
/// scoped `v8::String`.
pub(crate) fn latin1_to_string(bytes: &[u8]) -> String {
    if bytes.is_ascii() {
        // Safety: ASCII is valid UTF-8 byte-for-byte.
        unsafe { std::str::from_utf8_unchecked(bytes) }.to_string()
    } else {
        // Latin1 code points 0x80..=0xFF map 1:1 to Unicode scalars; `char`
        // conversion re-encodes them as two-byte UTF-8.
        bytes.iter().map(|&b| b as char).collect()
    }
}

/// The fast-call overload for `__ossido_encode_into`, invoked directly from
/// TurboFan-optimised code with no `FunctionCallbackInfo` trampoline and no
/// handle scopes. V8 dispatches here only when `source` is a sequential
/// one-byte (latin1) string — anything else (two-byte strings, cons strings,
/// unoptimised frames) takes [`encode_into_callback`] instead, so the two
/// must agree: latin1→UTF-8 with `read` counted in UTF-16 units (1 per latin1
/// char) and code points never split at the destination boundary.
///
/// Fast calls may not allocate on the V8 heap, re-enter JS, or throw; the
/// type mismatches the slow path reports as `TypeError`s are handled here by
/// writing nothing (the bootstrap always passes correct types).
pub(crate) extern "C" fn encode_into_fast(
    _receiver: v8::Local<v8::Value>,
    source: *const v8::fast_api::FastApiOneByteString,
    dest: v8::Local<v8::Value>,
    scratch: v8::Local<v8::Value>,
) {
    // Safety: V8 passes a valid string reference for the duration of the call.
    let bytes = unsafe { &*source }.as_bytes();
    let Ok(dest) = v8::Local::<v8::ArrayBufferView>::try_from(dest) else {
        return;
    };
    let Ok(scratch) = v8::Local::<v8::ArrayBufferView>::try_from(scratch) else {
        return;
    };

    let mut read = 0usize;
    let mut written = 0usize;
    let capacity = dest.byte_length();
    let out = dest.data() as *mut u8;
    if !out.is_null() {
        for &b in bytes {
            let need = if b < 0x80 { 1 } else { 2 };
            if written + need > capacity {
                break;
            }
            // Safety: `written + need <= capacity`, and a live attached view's
            // window is valid writable memory for the duration of this call.
            unsafe {
                if b < 0x80 {
                    *out.add(written) = b;
                } else {
                    *out.add(written) = 0xC0 | (b >> 6);
                    *out.add(written + 1) = 0x80 | (b & 0x3F);
                }
            }
            written += need;
            read += 1;
        }
    }

    if scratch.byte_length() >= 8 {
        let report = scratch.data() as *mut u32;
        if !report.is_null() {
            // Safety: the bootstrap owns this 2-element Uint32Array.
            unsafe {
                *report = read as u32;
                *report.add(1) = written as u32;
            }
        }
    }
}

/// `encode_into_fast`'s C signature: (receiver, seq-one-byte string, dest
/// view, scratch view) → void. `'static` so the type-info pointer baked into
/// function templates (and the external-references table) stays valid.
static ENCODE_INTO_FAST_ARGS: [v8::fast_api::CTypeInfo; 4] = [
    v8::fast_api::Type::V8Value.as_info(), // receiver
    v8::fast_api::Type::SeqOneByteString.as_info(),
    v8::fast_api::Type::V8Value.as_info(), // dest Uint8Array
    v8::fast_api::Type::V8Value.as_info(), // scratch Uint32Array
];
static ENCODE_INTO_FAST_INFO: super::FastCallDescriptor<v8::fast_api::CFunctionInfo> =
    super::FastCallDescriptor(v8::fast_api::CFunctionInfo::new(
        v8::fast_api::Type::Void.as_info(),
        &ENCODE_INTO_FAST_ARGS,
        v8::fast_api::Int64Representation::Number,
    ));
/// The fast overload registered alongside [`encode_into_callback`] in the
/// globals registry.
pub(crate) static ENCODE_INTO_CFN: super::FastCallDescriptor<v8::fast_api::CFunction> =
    super::FastCallDescriptor(v8::fast_api::CFunction::new(
        encode_into_fast as *const c_void,
        &ENCODE_INTO_FAST_INFO.0,
    ));

// --- TextDecoder ---------------------------------------------------------

/// `__ossido_encoding_for_label(label) -> canonicalName | undefined`
///
/// WHATWG label resolution (`"latin1"` → `"windows-1252"`, `"ucs-2"` →
/// `"utf-16le"`, …). `undefined` for unknown labels and for the `replacement`
/// encoding, which the spec requires `TextDecoder` to reject — the bootstrap
/// turns that into the spec's `RangeError`.
pub(crate) fn encoding_for_label_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let Some(label) = args.get(0).to_string(scope) else {
        return;
    };
    let label = label.to_rust_string_lossy(scope);
    if let Some(encoding) = encoding_rs::Encoding::for_label_no_replacement(label.as_bytes()) {
        if let Some(name) = v8::String::new(scope, encoding.name()) {
            rv.set(name.into());
        }
    }
    // Unknown label: leave the return value as `undefined`.
}

/// Resolve a canonical name the bootstrap obtained from
/// [`encoding_for_label_callback`] back to its encoding. Infallible for names
/// we produced; `None` only if JS calls the private hook with junk.
fn encoding_by_name(name: &str) -> Option<&'static encoding_rs::Encoding> {
    encoding_rs::Encoding::for_label(name.as_bytes())
}

/// Materialize decoded UTF-8 text as a V8 string, or throw when it exceeds
/// V8's string length cap.
fn utf8_to_v8<'s>(
    scope: &mut v8::HandleScope<'s>,
    utf8: &[u8],
) -> Option<v8::Local<'s, v8::String>> {
    let string = v8::String::new_from_utf8(scope, utf8, v8::NewStringType::Normal);
    if string.is_none() {
        throw_type_error(
            scope,
            "decode: decoded text exceeds the maximum string length",
        );
    }
    string
}

/// Shared non-streaming decode: `bytes` in `encoding` to a V8 string.
fn decode_full<'s>(
    scope: &mut v8::HandleScope<'s>,
    encoding: &'static encoding_rs::Encoding,
    bytes: &[u8],
    fatal: bool,
    ignore_bom: bool,
) -> Option<v8::Local<'s, v8::String>> {
    // Fast path — UTF-8 input that is already valid goes straight into a V8
    // string: one SIMD validation pass, no intermediate transcode or copy.
    if encoding == encoding_rs::UTF_8 {
        let body = if !ignore_bom {
            bytes.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(bytes)
        } else {
            bytes
        };
        if simdutf8::basic::from_utf8(body).is_ok() {
            return utf8_to_v8(scope, body);
        }
        if fatal {
            throw_type_error(scope, "decode: invalid UTF-8 data");
            return None;
        }
        // Invalid and non-fatal: fall through to encoding_rs for correct
        // U+FFFD replacement.
    }

    // Fast path — windows-1252 (the `latin1` label family) with pure-ASCII
    // bytes is its own decoding; V8's one-byte constructor takes it directly.
    if encoding == encoding_rs::WINDOWS_1252 && bytes.is_ascii() {
        let string = v8::String::new_from_one_byte(scope, bytes, v8::NewStringType::Normal);
        if string.is_none() {
            throw_type_error(
                scope,
                "decode: decoded text exceeds the maximum string length",
            );
        }
        return string;
    }

    // General path: encoding_rs with a one-shot decoder (correct BOM handling
    // for the decoder's own encoding, per TextDecoder semantics — never BOM
    // *sniffing* into a different encoding).
    let mut decoder = if ignore_bom {
        encoding.new_decoder_without_bom_handling()
    } else {
        encoding.new_decoder_with_bom_removal()
    };
    decode_chunk(scope, &mut decoder, bytes, true, fatal)
}

/// Run one `encoding_rs` decode step (streaming or final) into a V8 string.
fn decode_chunk<'s>(
    scope: &mut v8::HandleScope<'s>,
    decoder: &mut encoding_rs::Decoder,
    bytes: &[u8],
    last: bool,
    fatal: bool,
) -> Option<v8::Local<'s, v8::String>> {
    let capacity = decoder
        .max_utf8_buffer_length(bytes.len())
        .unwrap_or(bytes.len().saturating_mul(3) + 4);
    let mut out = String::with_capacity(capacity);
    if fatal {
        let (result, _read) = decoder.decode_to_string_without_replacement(bytes, &mut out, last);
        if let encoding_rs::DecoderResult::Malformed(..) = result {
            throw_type_error(scope, "decode: invalid data for the stream's encoding");
            return None;
        }
    } else {
        let _ = decoder.decode_to_string(bytes, &mut out, last);
    }
    utf8_to_v8(scope, out.as_bytes())
}

/// `__ossido_decode(canonicalName, input, fatal, ignoreBOM) -> string`
///
/// The stateless one-shot decode behind `TextDecoder.prototype.decode` without
/// `{stream: true}` — no per-instance native state is ever allocated for it.
pub(crate) fn decode_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let Some(name) = args.get(0).to_string(scope) else {
        return;
    };
    let name = name.to_rust_string_lossy(scope);
    let Some(encoding) = encoding_by_name(&name) else {
        throw_type_error(scope, "decode: unknown encoding");
        return;
    };
    let fatal = args.get(2).boolean_value(scope);
    let ignore_bom = args.get(3).boolean_value(scope);

    let input = args.get(1);
    let bytes: &[u8] = if input.is_undefined() {
        &[]
    } else {
        match bytes_of(scope, input) {
            Some(bytes) => bytes,
            None => {
                throw_type_error(
                    scope,
                    "decode: input must be an ArrayBuffer or ArrayBufferView",
                );
                return;
            }
        }
    };

    if let Some(string) = decode_full(scope, encoding, bytes, fatal, ignore_bom) {
        rv.set(string.into());
    }
}

/// `__ossido_decoder_new(canonicalName, fatal, ignoreBOM) -> id`
///
/// Opens the per-instance streaming state for a `TextDecoder` the first time
/// it decodes with `{stream: true}`.
pub(crate) fn decoder_new_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let Some(name) = args.get(0).to_string(scope) else {
        return;
    };
    let name = name.to_rust_string_lossy(scope);
    let Some(encoding) = encoding_by_name(&name) else {
        throw_type_error(scope, "decode: unknown encoding");
        return;
    };
    let fatal = args.get(1).boolean_value(scope);
    let ignore_bom = args.get(2).boolean_value(scope);
    let Some(registry) = decoder_registry(scope) else {
        throw_type_error(scope, "decode: streaming is unavailable in this runtime");
        return;
    };

    let decoder = if ignore_bom {
        encoding.new_decoder_without_bom_handling()
    } else {
        encoding.new_decoder_with_bom_removal()
    };
    let id = registry.next_id.wrapping_add(1).max(1);
    registry.next_id = id;
    registry
        .decoders
        .insert(id, StreamingDecoder { decoder, fatal });
    rv.set(v8::Integer::new_from_unsigned(scope, id).into());
}

/// `__ossido_decoder_decode(id, input, last) -> string`
///
/// One streaming step. `last = true` is the spec's end-of-stream decode: it
/// flushes carried state (emitting U+FFFD / throwing for a dangling partial
/// sequence) and frees the native decoder. A decoder that errors in `fatal`
/// mode is also discarded — continuing from a poisoned state is never valid.
pub(crate) fn decoder_decode_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let id = args.get(0).uint32_value(scope).unwrap_or(0);
    let last = args.get(2).boolean_value(scope);

    let input = args.get(1);
    let bytes: &[u8] = if input.is_undefined() {
        &[]
    } else {
        match bytes_of(scope, input) {
            Some(bytes) => bytes,
            None => {
                throw_type_error(
                    scope,
                    "decode: input must be an ArrayBuffer or ArrayBufferView",
                );
                return;
            }
        }
    };

    let Some(registry) = decoder_registry(scope) else {
        return;
    };
    let Some(state) = registry.decoders.get_mut(&id) else {
        throw_type_error(scope, "decode: the stream for this TextDecoder is closed");
        return;
    };
    let fatal = state.fatal;

    let result = decode_chunk(scope, &mut state.decoder, bytes, last, fatal);

    // End-of-stream or a fatal error closes the native state.
    if last || result.is_none() {
        if let Some(registry) = decoder_registry(scope) {
            registry.decoders.remove(&id);
        }
    }
    if let Some(string) = result {
        rv.set(string.into());
    }
}

/// `__ossido_decoder_free(id)` — drop an abandoned mid-stream decoder (called
/// by the bootstrap's `FinalizationRegistry` backstop).
pub(crate) fn decoder_free_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let id = args.get(0).uint32_value(scope).unwrap_or(0);
    if let Some(registry) = decoder_registry(scope) {
        registry.decoders.remove(&id);
    }
}

// --- Bootstrap -----------------------------------------------------------

/// The spec-shaped `TextEncoder` / `TextDecoder` classes over the native
/// callbacks. Installed before any bundle evaluates, so bundled polyfills'
/// `scope.TextEncoder = scope.TextEncoder || …` guards keep the natives.
pub(crate) const TEXT_CODEC_BOOTSTRAP: &str = r#"
(function () {
  "use strict";

  // Reused by every encodeInto call: [read, written] out-params.
  var encodeIntoScratch = new Uint32Array(2);

  class TextEncoder {
    get encoding() { return "utf-8"; }
    encode(input) {
      return __ossido_encode_utf8(input === undefined ? "" : String(input));
    }
    encodeInto(source, destination) {
      __ossido_encode_into(String(source), destination, encodeIntoScratch);
      return { read: encodeIntoScratch[0], written: encodeIntoScratch[1] };
    }
  }

  // Best-effort reclamation of native state for TextDecoders abandoned in the
  // middle of a stream (spec-following users always reach the end-of-stream
  // decode, which frees eagerly).
  var abandoned = typeof FinalizationRegistry === "function"
    ? new FinalizationRegistry(function (id) { __ossido_decoder_free(id); })
    : null;

  class TextDecoder {
    constructor(label, options) {
      var name = __ossido_encoding_for_label(label === undefined ? "utf-8" : String(label));
      if (name === undefined) {
        throw new RangeError(
          "Failed to construct 'TextDecoder': the encoding label provided ('" + label + "') is invalid."
        );
      }
      this._encoding = name.toLowerCase();
      this._name = name;
      this._fatal = !!(options && options.fatal);
      this._ignoreBOM = !!(options && options.ignoreBOM);
      this._streamId = 0;
      this._streamToken = null;
    }
    get encoding() { return this._encoding; }
    get fatal() { return this._fatal; }
    get ignoreBOM() { return this._ignoreBOM; }
    decode(input, options) {
      var stream = !!(options && options.stream);
      if (this._streamId === 0) {
        if (!stream) {
          // The overwhelmingly common shape: a stateless one-shot decode.
          return __ossido_decode(this._name, input, this._fatal, this._ignoreBOM);
        }
        this._streamId = __ossido_decoder_new(this._name, this._fatal, this._ignoreBOM);
        if (abandoned) {
          this._streamToken = { id: this._streamId };
          abandoned.register(this, this._streamId, this._streamToken);
        }
      }
      var out;
      try {
        out = __ossido_decoder_decode(this._streamId, input, !stream);
      } finally {
        if (!stream) {
          // The native side already freed the decoder (end-of-stream or a
          // fatal error); forget the handle either way.
          if (abandoned && this._streamToken) abandoned.unregister(this._streamToken);
          this._streamId = 0;
          this._streamToken = null;
        }
      }
      return out;
    }
  }

  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
})();
"#;
