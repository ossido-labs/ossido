/**
 * The `ssr_rs` V8 runtime only exposes `globalThis` — it defines neither
 * `window` nor `global`.
 *
 * Some UMD-style polyfills install themselves onto whichever global object
 * they can find, falling back to `undefined`:
 *
 * ```js
 * // fast-text-encoding
 * })(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : void 0)
 * // url-search-params-polyfill
 * })(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : void 0)
 * ```
 *
 * With no `window`/`global`, that scope resolves to `undefined` and the init
 * IIFE throws `Cannot read properties of undefined (reading 'TextEncoder')`.
 *
 * Aliasing `global` to `globalThis` gives those polyfills a valid target.
 *
 * @warning We intentionally do NOT define `window`. Server-side detection
 * across the framework relies on `typeof window === 'undefined'` (see
 * `ossido-router`'s `RouterContext`), so defining it would make SSR code paths
 * believe they are running in the browser.
 *
 * This module must be imported before any polyfill that reads `global`.
 */
declare global {
  // eslint-disable-next-line no-var
  var global: typeof globalThis
}

;(globalThis as { global?: typeof globalThis }).global ??= globalThis

export {}
