/**
 * Most of this file is derived from the Vite project.
 * We need to re-export it to implement the required changes for Tuono.
 *
 * Source: https://github.com/vitejs/vite/blob/2c51565ec044904a080ef5649034c37f02212c7b/packages/vite/src/client/overlay.ts#L209
 * License: https://github.com/vitejs/vite/blob/main/LICENSE
 *
 * @see https://github.com/tuono-labs/tuono/pull/607
 * @see https://github.com/vitejs/vite/issues/19552
 */
import type { ErrorPayload, Plugin } from 'vite'

// Set the `:host` styles to ensure that Playwright can detect the element as visible
// Palette and fonts mirror the tuono-ui design tokens (see components/base.css)
// so this build-time overlay matches the runtime error screens. The Google Fonts
// import must stay first; it loads the same Noto Sans / JetBrains Mono families.
const templateStyle = /*css*/ `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans:wght@400;500;600;700&display=swap');
:host {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99999;
  --sans: 'Noto Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica,
    Arial, sans-serif;
  --monospace: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas,
    'Liberation Mono', monospace;
  --accent: #f43f5e;
  --red: #ff8fa3;
  --yellow: #e6e6e6;
  --purple: #ff8fa3;
  --cyan: #c7c7cf;
  --dim: #8a8a94;

  --window-background: #0a0a0e;
  --window-color: #e6e6e6;
}

.backdrop {
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  margin: 0;
  background: rgba(0, 0, 0, 0.66);
}

.window {
  font-family: var(--sans);
  line-height: 1.5;
  max-width: 80vw;
  color: var(--window-color);
  box-sizing: border-box;
  margin: 30px auto;
  padding: 2.5vh 4vw;
  position: relative;
  background: var(--window-background);
  border-radius: 8px;
  box-shadow: 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22);
  overflow: hidden;
  border-top: 8px solid var(--accent);
  direction: ltr;
  text-align: left;
}

pre {
  font-family: var(--monospace);
  font-size: 16px;
  margin-top: 0;
  overflow-x: scroll;
  scrollbar-width: none;
}

pre::-webkit-scrollbar {
  display: none;
}

pre.frame::-webkit-scrollbar {
  display: block;
  height: 5px;
}

pre.frame::-webkit-scrollbar-thumb {
  background: #999;
  border-radius: 5px;
}

pre.frame {
  scrollbar-width: thin;
}

.message {
  font-family: var(--sans);
  line-height: 1.3;
  font-weight: 600;
  white-space: pre-wrap;
  margin-bottom: 1rem;
}

.message-body {
  color: var(--red);
}

.plugin {
  color: var(--purple);
}

.file {
  color: var(--cyan);
  margin-bottom: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.frame {
  color: var(--yellow);
}

.stack {
  font-size: 13px;
  color: var(--dim);
}

.tip {
  font-size: 13px;
  color: #999;
  border-top: 1px dotted #999;
  padding-top: 13px;
  line-height: 1.8;
}

code {
  font-size: 13px;
  font-family: var(--monospace);
  color: var(--yellow);
}

.file-link {
  text-decoration: underline;
  cursor: pointer;
}

kbd {
  line-height: 1.5;
  font-family: ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.75rem;
  font-weight: 700;
  background-color: rgb(38, 40, 44);
  color: rgb(166, 167, 171);
  padding: 0.15rem 0.3rem;
  border-radius: 0.25rem;
  border-width: 0.0625rem 0.0625rem 0.1875rem;
  border-style: solid;
  border-color: rgb(54, 57, 64);
  border-image: initial;
}
`

const fileRE = /(?:[a-zA-Z]:\\|\/).*?:\d+:\d+/g
const codeframeRE = /^(?:>?\s*\d+\s+\|.*|\s+\|\s*\^.*)\r?\n/gm

const overlayTemplate = `
<div class="backdrop" part="backdrop">
  <div class="window" part="window">
    <pre class="message" part="message"><span class="plugin" part="plugin"></span><span class="message-body" part="message-body"></span></pre>
    <pre class="file" part="file">
    </pre>
    <pre class="frame" part="frame"></pre>
    <pre class="stack" part="stack"></pre>
    <div class="tip" part="tip">Click outside, press <kbd>Esc</kbd> key, or fix the code to dismiss.</div>
  </div>
  <style>${templateStyle}</style>
</div>
`

const HTMLElement: typeof globalThis.HTMLElement =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-extraneous-class
  globalThis.HTMLElement ?? class {}

export class ErrorOverlay extends HTMLElement {
  root: ShadowRoot
  closeOnEsc: (event: KeyboardEvent) => void

  constructor(err: ErrorPayload['err'], links = true) {
    super()

    this.root = this.attachShadow({ mode: 'open' })
    const root = this.getRoot()

    root.innerHTML = overlayTemplate

    codeframeRE.lastIndex = 0
    const hasFrame = err.frame && codeframeRE.test(err.frame)
    const message = hasFrame
      ? err.message.replace(codeframeRE, '')
      : err.message

    if (err.plugin) {
      this.text('.plugin', `[plugin:${err.plugin}] `)
    }

    this.text('.message-body', message.trim())

    const [file] = (err.loc?.file || err.id || 'unknown file').split(`?`)
    if (err.loc && file) {
      this.text('.file', `${file}:${err.loc.line}:${err.loc.column}`, links)
    } else if (err.id && file) {
      this.text('.file', file)
    }

    if (hasFrame && err.frame) {
      this.text('.frame', err.frame.trim())
    }
    this.text('.stack', err.stack, links)

    const rootWindowElement = root.querySelector('.window') as HTMLElement
    rootWindowElement.addEventListener('click', (event: Event) => {
      event.stopPropagation()
    })

    this.addEventListener('click', () => {
      this.close()
    })

    this.closeOnEsc = (event): void => {
      if (event.key === 'Escape' || event.code === 'Escape') {
        this.close()
      }
    }

    const closeOnEsc = this.getCloseOnEsc()

    document.addEventListener('keydown', closeOnEsc)
  }

  getRoot(): ShadowRoot {
    return this.root
  }

  getCloseOnEsc(): this['closeOnEsc'] {
    return this.closeOnEsc
  }

  text(selector: string, text: string, linkFiles = false): void {
    const root = this.getRoot()

    const el = root.querySelector(selector) as HTMLElement
    if (!linkFiles) {
      el.textContent = text
    } else {
      let curIndex = 0
      let match: RegExpExecArray | null
      fileRE.lastIndex = 0
      while ((match = fileRE.exec(text))) {
        const { 0: file, index } = match
        const frag = text.slice(curIndex, index)
        el.appendChild(document.createTextNode(frag))
        const link = document.createElement('a')
        link.textContent = file
        link.className = 'file-link'
        el.appendChild(link)
        curIndex += frag.length + file.length
      }
    }
  }
  close(): void {
    const closeOnEsc = this.getCloseOnEsc()
    this.parentNode?.removeChild(this)
    document.removeEventListener('keydown', closeOnEsc)
  }
}

function getOverlayCode(): string {
  // Bind the class to `const ErrorOverlay` explicitly: the bundler may emit it
  // as an anonymous class expression (`class extends HTMLElement {…}`), which is
  // a syntax error as a bare statement. The binding also shadows Vite's class
  // (renamed to `ViteErrorOverlay` by patchOverlay) so `customElements.define`
  // registers ours.
  return `
		const overlayTemplate = \`${overlayTemplate}\`;
		const ErrorOverlay = ${ErrorOverlay.toString()};
	`
}

// The exact declaration of Vite's built-in overlay class in its HMR client.
// Vite 8 emits `var ErrorOverlay = class extends HTMLElement` (older versions
// used `class ErrorOverlay extends HTMLElement`). We match on this string —
// which only appears in Vite's client — instead of the module id, so the patch
// survives changes to how the client module is resolved/served.
const VITE_OVERLAY_CLASS_DECL = 'var ErrorOverlay = class extends HTMLElement'

function patchOverlay(code: string): string {
  // Inject our overlay (its own `overlayTemplate` + `ErrorOverlay` class) ahead
  // of Vite's, and rename Vite's class so `customElements.define(overlayId,
  // ErrorOverlay)` registers ours instead.
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
