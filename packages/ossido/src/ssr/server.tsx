// #region POLYFILLS
/**
 * Ossido internally uses a V8 JS engine that implements very few
 * browser/node/deno APIs in order to make it super fast and
 * share it within a multi thread runtime.
 *
 * While this is the reason of its speed, server side rendering
 * requires some JS APIs that need to be polyfilled.
 *
 * We basically have three ways to polyfill APIs:
 * 1. Create them with rust and expose them directly through the V8 engine to
 *    the JS source.
 * 2. Polyfill them at the beginning of the JS source
 *    (what we are doing here)
 * 3. Inject them via rollup-inject plugin, when needed
 *
 * Q: Why not all the libraries can be just injected with rollup-inject?
 * A: Leaving to rollup the duty of linking them can cause to declare them after their usage.
 *    The following APIs are JS classes, and are not hoisted, hence this might
 *    cause ReferenceError(s).
 *
 * The best solution is to create these polyfills within the rust environment
 * and share the classes in the JS scope by passing them through the V8 engine
 * (best for speed and code quality).
 *
 * This function might be a good entry point for adding such polyfills
 * https://docs.rs/ssr_rs/latest/ssr_rs/struct.Ssr.html#method.add_global_fn
 */
// Must run before the polyfills below: aliases `global` to `globalThis` so
// their UMD init IIFEs find a valid scope in the `window`/`global`-less
// ssr_rs V8 runtime instead of dereferencing `undefined`.
import './polyfills/globalScope'
import 'fast-text-encoding'
import 'url-search-params-polyfill'

/* eslint-disable import/order, import/newline-after-import */
import { MessageChannelPolyfill } from './polyfills/MessageChannel'
;(function (
  scope: Partial<Pick<typeof globalThis, 'MessageChannel'>> = {},
): void {
  scope['MessageChannel'] = scope['MessageChannel'] ?? MessageChannelPolyfill
})(this)
/* eslint-enable import/order, import/newline-after-import */
// #endregion POLYFILLS

import type { ReadableStream } from 'node:stream/web'

import type { JSX } from 'react'
import { renderToReadableStream } from 'react-dom/server'
import { createRouter, preloadRouteChain } from 'ossido-router'
import type { createRoute } from 'ossido-router'

import { OssidoEntryPoint } from '../shared/OssidoEntryPoint'
import type { ServerPayload } from '../types'

import { streamToString, createUtf8Streamer } from './utils'

type RouteTree = ReturnType<typeof createRoute>

/**
 * Chunk sink injected by the Rust `ssr_rs` runtime for streaming renders (see
 * `Ssr::render_to_stream`). Each call hands one HTML fragment to Rust, which
 * forwards it to the client immediately instead of buffering the whole page.
 */
declare const __ssr_write: ((chunk: string) => void) | undefined

interface ServerSideRenderer {
  /** Buffered render — resolves the whole page to a single HTML string. */
  renderFn: (payload: string | undefined) => Promise<string>
  /** Streaming render — flushes each HTML chunk via `__ssr_write`. */
  renderStream: (payload: string | undefined) => Promise<void>
}

export function serverSideRendering(routeTree: RouteTree): ServerSideRenderer {
  // Build the React element for a request. Shared by the buffered and streaming
  // entry points so they render exactly the same tree.
  //
  // Async because the matched route's code (page + wrapping layouts) is
  // preloaded first: routes are `React.lazy`-wrapped, and rendering one that
  // hasn't loaded suspends its boundary, which pushes the page content into an
  // out-of-order late chunk (empty shell paints first — a visible flash on
  // every cold load). In the bundled SSR output the dynamic imports are
  // inlined, so this resolves in a microtask.
  const element = async (payload: string | undefined): Promise<JSX.Element> => {
    const serverPayload = (payload ? JSON.parse(payload) : {}) as ServerPayload
    const router = createRouter({ routeTree })
    await preloadRouteChain(router, serverPayload.location?.pathname)
    return (
      // `rawServerPayload` is the exact JSON Rust already produced; passing it
      // lets `OssidoScripts` embed it verbatim instead of re-stringifying the
      // parsed payload inside V8.
      <OssidoEntryPoint
        router={router}
        serverPayload={serverPayload}
        rawServerPayload={payload}
      />
    )
  }

  return {
    /**
     * Buffered render: resolve the whole page to a single string. Used for
     * error pages, static export (SSG), `catch_all`, and the dev fallback —
     * anywhere the caller needs the complete HTML up front.
     */
    async renderFn(payload: string | undefined): Promise<string> {
      const stream = await renderToReadableStream(await element(payload))
      await stream.allReady
      return await streamToString(
        // ReadableStream should be implemented in node)
        stream as unknown as ReadableStream<Uint8Array>,
      )
    },

    /**
     * Streaming render: flush each HTML chunk to Rust via
     * `__ssr_write` as React produces it, so the shell reaches the
     * client without waiting for the full page. `renderToReadableStream`
     * rejects on a *shell* error before any chunk is written, so Rust can still
     * send a 500 instead of a partial 200 in that case.
     */
    async renderStream(payload: string | undefined): Promise<void> {
      const write = __ssr_write
      if (typeof write !== 'function') {
        throw new Error('__ssr_write is not registered by the runtime')
      }

      const stream = await renderToReadableStream(await element(payload))

      const streamer = createUtf8Streamer()
      for await (const chunk of stream as unknown as ReadableStream<Uint8Array>) {
        const text = streamer.push(chunk)
        if (text) write(text)
      }
      const tail = streamer.flush()
      if (tail) write(tail)
    },
  }
}
