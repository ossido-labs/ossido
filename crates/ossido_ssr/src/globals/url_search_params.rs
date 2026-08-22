//! Runtime-provided `URLSearchParams`, replacing the bundle-side
//! `url-search-params-polyfill`.
//!
//! The codec work — WHATWG `application/x-www-form-urlencoded` parsing and
//! serialization, with its `+`-as-space and percent-escaping rules — is
//! native, via the `form_urlencoded` crate (the `url` crate family, i.e.
//! Servo's implementation). The class itself and its pair-list state live in
//! the bootstrap: list manipulation is cheap JS the JIT handles well, and the
//! spec's semantics (`set` collapsing duplicates in place, stable `sort`,
//! value-filtered `delete`/`has`) are clearer written out than threaded
//! through native calls.

use super::text_codecs::throw_type_error;

/// `__ossido_urlencoded_parse(string) -> Array<[name, value]>`
pub(crate) fn urlencoded_parse_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let Some(input) = args.get(0).to_string(scope) else {
        return;
    };
    let input = input.to_rust_string_lossy(scope);
    let pairs: Vec<(String, String)> = form_urlencoded::parse(input.as_bytes())
        .into_owned()
        .collect();

    let out = v8::Array::new(scope, pairs.len() as i32);
    for (index, (name, value)) in pairs.iter().enumerate() {
        let (Some(name), Some(value)) =
            (v8::String::new(scope, name), v8::String::new(scope, value))
        else {
            continue;
        };
        let pair = v8::Array::new_with_elements(scope, &[name.into(), value.into()]);
        out.set_index(scope, index as u32, pair.into());
    }
    rv.set(out.into());
}

/// `__ossido_urlencoded_serialize(Array<[name, value]>) -> string`
pub(crate) fn urlencoded_serialize_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let Ok(pairs) = v8::Local::<v8::Array>::try_from(args.get(0)) else {
        throw_type_error(scope, "URLSearchParams: expected the internal pair list");
        return;
    };

    let mut serializer = form_urlencoded::Serializer::new(String::new());
    for index in 0..pairs.length() {
        let Some(entry) = pairs.get_index(scope, index) else {
            continue;
        };
        let Ok(pair) = v8::Local::<v8::Array>::try_from(entry) else {
            continue;
        };
        let name = pair
            .get_index(scope, 0)
            .and_then(|v| v.to_string(scope))
            .map(|s| s.to_rust_string_lossy(scope))
            .unwrap_or_default();
        let value = pair
            .get_index(scope, 1)
            .and_then(|v| v.to_string(scope))
            .map(|s| s.to_rust_string_lossy(scope))
            .unwrap_or_default();
        serializer.append_pair(&name, &value);
    }
    let serialized = serializer.finish();
    if let Some(out) = v8::String::new(scope, &serialized) {
        rv.set(out.into());
    }
}

/// The `URLSearchParams` class over the native codec functions. Full spec
/// surface — every constructor init form, value-filtered `delete`/`has`,
/// first-entry-in-place `set`, stable `sort`, `size`, live iteration — so the
/// bundle-side polyfill's feature detection keeps the native implementation.
pub(crate) const URL_SEARCH_PARAMS_BOOTSTRAP: &str = r#"
(function () {
  "use strict";

  class URLSearchParams {
    constructor(init) {
      this._pairs = [];
      if (init === undefined || init === null) return;
      if (typeof init === "string") {
        const source = init[0] === "?" ? init.slice(1) : init;
        if (source) this._pairs = __ossido_urlencoded_parse(source);
        return;
      }
      if (init instanceof URLSearchParams) {
        this._pairs = init._pairs.map(function (p) { return [p[0], p[1]]; });
        return;
      }
      if (typeof init[Symbol.iterator] === "function") {
        for (const entry of init) {
          const pair = Array.from(entry);
          if (pair.length !== 2) {
            throw new TypeError(
              "Failed to construct 'URLSearchParams': each init pair must have exactly two elements."
            );
          }
          this._pairs.push([String(pair[0]), String(pair[1])]);
        }
        return;
      }
      if (typeof init === "object") {
        for (const key of Object.keys(init)) {
          this._pairs.push([String(key), String(init[key])]);
        }
        return;
      }
      throw new TypeError("Failed to construct 'URLSearchParams': invalid init value.");
    }

    append(name, value) {
      this._pairs.push([String(name), String(value)]);
    }

    delete(name, value) {
      name = String(name);
      const filterValue = value !== undefined;
      if (filterValue) value = String(value);
      this._pairs = this._pairs.filter(function (p) {
        return p[0] !== name || (filterValue && p[1] !== value);
      });
    }

    get(name) {
      name = String(name);
      for (const p of this._pairs) if (p[0] === name) return p[1];
      return null;
    }

    getAll(name) {
      name = String(name);
      return this._pairs
        .filter(function (p) { return p[0] === name; })
        .map(function (p) { return p[1]; });
    }

    has(name, value) {
      name = String(name);
      const filterValue = value !== undefined;
      if (filterValue) value = String(value);
      return this._pairs.some(function (p) {
        return p[0] === name && (!filterValue || p[1] === value);
      });
    }

    set(name, value) {
      name = String(name);
      value = String(value);
      let replaced = false;
      const next = [];
      for (const p of this._pairs) {
        if (p[0] !== name) {
          next.push(p);
        } else if (!replaced) {
          next.push([name, value]);
          replaced = true;
        }
      }
      if (!replaced) next.push([name, value]);
      this._pairs = next;
    }

    sort() {
      // Array.prototype.sort is stable, giving the spec's "relative order of
      // equal names preserved" for free; comparison is by code units.
      this._pairs.sort(function (a, b) {
        return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
      });
    }

    forEach(callback, thisArg) {
      for (const p of this._pairs.slice()) callback.call(thisArg, p[1], p[0], this);
    }

    get size() {
      return this._pairs.length;
    }

    toString() {
      return this._pairs.length === 0 ? "" : __ossido_urlencoded_serialize(this._pairs);
    }

    *entries() { for (const p of this._pairs) yield [p[0], p[1]]; }
    *keys() { for (const p of this._pairs) yield p[0]; }
    *values() { for (const p of this._pairs) yield p[1]; }
    [Symbol.iterator]() { return this.entries(); }
  }

  globalThis.URLSearchParams = globalThis.URLSearchParams || URLSearchParams;
})();
"#;
