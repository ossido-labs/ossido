// Minimal stand-in for a built ossido `prod-server.js`, used by the ossido_lib
// integration tests (see tests/utils/mock_server.rs).
//
// It is NOT a React build — it is a hand-written implementation of the SSR
// bundle contract that `ssr_rs` + `crate::ssr::Js` depend on, so the tests can
// exercise the Rust server/render-pool/streaming plumbing without running the
// full JS build (vite + react-swc + the framework packages). Real React /
// polyfill / streaming behaviour in the actual V8 runtime is covered by the
// Playwright e2e suite, which runs against a real `ossido build`.
//
// The contract: an entry object (the value the wrapping IIFE returns) exposing
// two function exports, resolved by name from `ssr_rs`'s `fn_map`:
//
//   * renderFn(payload)     — buffered: returns the whole document as a string.
//                             Driven by `Ssr::render` / `Js::render_to_string`
//                             (catch_all, error pages, SSG, dev fallback).
//   * renderStream(payload) — streaming: emits the document in chunks through
//                             the `__ssr_write` global ossido installs. Driven by
//                             `Js::render_stream` (which installs a sink and
//                             calls `Ssr::render`). Two chunks are emitted (shell
//                             then tail) so the multi-chunk path is exercised.
//
// `payload` is the JSON string the Rust side passes; it is embedded verbatim as
// `window.__OSSIDO_SERVER_PAYLOAD__`, mirroring the real bundle closely enough
// for the assertions (a full `<!DOCTYPE html>` document that carries the
// payload). Both exports are synchronous — `ssr_rs` handles a plain return the
// same as a resolved promise.
;(function (exports) {
  'use strict'

  function renderDocument(payload) {
    var raw = payload == null ? '' : String(payload)
    return (
      '<!DOCTYPE html><html><head></head><body>' +
      '<main><div id="app">ossido ssr fixture</div></main>' +
      '<script>window.__OSSIDO_SERVER_PAYLOAD__ = ' +
      (raw || 'null') +
      '</script>' +
      '</body></html>'
    )
  }

  exports.renderFn = function renderFn(payload) {
    return renderDocument(payload)
  }

  exports.renderStream = function renderStream(payload) {
    var html = renderDocument(payload)
    // Split after the shell's closing </main> so the runtime sees more than one
    // chunk: the shell flushes first, the tail follows.
    var boundary = html.indexOf('</main>') + '</main>'.length
    __ssr_write(html.slice(0, boundary))
    __ssr_write(html.slice(boundary))
  }

  return exports
})({})
