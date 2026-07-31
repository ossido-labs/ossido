/**
 * Bridges Vite's HMR error overlay into Tuono's unified dev error overlay.
 *
 * Vite's client creates an `ErrorOverlay` custom element on a build/compile
 * error and calls `.close()` on it once the error clears. Rather than let Vite
 * render its own overlay, `ErrorOverlayVitePlugin` patches the client so that
 * `ErrorOverlay` is *this* class — which renders nothing and instead forwards
 * the error to the tuono dev error store (`window.__TUONO_DEV_ERRORS__`). Build
 * errors then appear in the same browsable React overlay as runtime errors.
 *
 * The patch matches on the exact class declaration string (which only appears
 * in Vite's client) instead of a module id, so it survives changes to how the
 * client is resolved/served.
 *
 * @see packages/tuono-ui/src/components/devErrorStore.ts (the bridge target)
 * @see https://github.com/tuono-labs/tuono/pull/607
 */
import type { ErrorPayload, Plugin } from 'vite'

const HTMLElement: typeof globalThis.HTMLElement =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  globalThis.HTMLElement ?? (class {} as typeof globalThis.HTMLElement)

/**
 * The element Vite instantiates on a build error. It never renders; it reports
 * the error to the tuono store (buffering if the store hasn't loaded yet) and
 * clears it on `.close()`. This class's *source* (via `toString()`) is what the
 * plugin injects into Vite's client, so it must not reference anything outside
 * its own body other than browser globals.
 */
export class ErrorOverlay extends HTMLElement {
  constructor(err: ErrorPayload['err']) {
    super()
    const globalWindow = window as unknown as Record<string, unknown>
    const build = {
      message: err.message,
      stack: err.stack,
      id: err.id,
      frame: err.frame,
      plugin: err.plugin,
      loc: err.loc,
    }
    const store = globalWindow['__TUONO_DEV_ERRORS__'] as
      | { addBuildError?: (b: unknown) => void }
      | undefined
    if (typeof store?.addBuildError === 'function') {
      store.addBuildError(build)
    } else {
      // The store module hasn't loaded yet — buffer for it to drain on init.
      const buffer = (globalWindow['__TUONO_DEV_ERRORS_BUFFER__'] ??=
        []) as Array<unknown>
      buffer.push(build)
    }
  }

  close(): void {
    const globalWindow = window as unknown as Record<string, unknown>
    const store = globalWindow['__TUONO_DEV_ERRORS__'] as
      | { clearBuildErrors?: () => void }
      | undefined
    store?.clearBuildErrors?.()
    this.parentNode?.removeChild(this)
  }
}

function getOverlayCode(): string {
  // Bind explicitly to `const ErrorOverlay`: the bundler may emit the class as
  // an anonymous expression, which is a syntax error as a bare statement. The
  // binding also shadows Vite's class (renamed to `ViteErrorOverlay`) so
  // `customElements.define(overlayId, ErrorOverlay)` registers ours.
  return `const ErrorOverlay = ${ErrorOverlay.toString()};`
}

// The exact declaration of Vite's built-in overlay class in its HMR client.
// Vite 8 emits `var ErrorOverlay = class extends HTMLElement` (older versions
// used `class ErrorOverlay extends HTMLElement`). We match on this string —
// which only appears in Vite's client — instead of the module id, so the patch
// survives changes to how the client module is resolved/served.
const VITE_OVERLAY_CLASS_DECL = 'var ErrorOverlay = class extends HTMLElement'

function patchOverlay(code: string): string {
  // Replace Vite's overlay class with our bridge, and rename Vite's so it stays
  // syntactically valid (but unused).
  return code.replace(
    VITE_OVERLAY_CLASS_DECL,
    getOverlayCode() + '\nvar ViteErrorOverlay = class extends HTMLElement',
  )
}

export const ErrorOverlayVitePlugin: Plugin = {
  name: 'tuono-error-overlay-plugin',
  transform(code, _id, opts) {
    if (opts?.ssr) return
    if (!code.includes(VITE_OVERLAY_CLASS_DECL)) return

    return patchOverlay(code)
  },
}
