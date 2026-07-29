import { useEffect, useRef } from 'react'
import type { JSX } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ErrorPayload } from 'vite'

import { ErrorOverlay } from './error-overlay'

type ViteError = ErrorPayload['err']

const CUSTOM_ELEMENT_TAG = 'tuono-vite-error-overlay-demo'

/**
 * Mounts the real Vite overlay custom element with a mock error payload. In dev
 * this element is injected into Vite's HMR client; here we register it and
 * instantiate it directly so the styling can be previewed in isolation.
 */
function ViteOverlayPreview({ err }: { err: ViteError }): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect((): (() => void) => {
    if (!customElements.get(CUSTOM_ELEMENT_TAG)) {
      customElements.define(CUSTOM_ELEMENT_TAG, ErrorOverlay)
    }
    const host = hostRef.current
    // `links = false`: don't turn file paths into editor-open links (there's no
    // Vite client to handle the click in Storybook).
    const overlay = new ErrorOverlay(err, false)
    host?.appendChild(overlay)
    return (): void => overlay.remove()
  }, [err])

  return <div ref={hostRef} />
}

const meta = {
  title: 'Default Screens/ViteErrorOverlay',
  component: ViteOverlayPreview,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ViteOverlayPreview>

export default meta
type Story = StoryObj<typeof meta>

/** A compile/syntax error (with a code frame), the most common HMR overlay. */
export const CompileError: Story = {
  args: {
    err: {
      message: 'Expression expected',
      stack: '',
      id: '/Users/me/app/src/routes/index.tsx',
      plugin: 'vite:react-swc',
      frame: [
        '13 |   return <main>{children}</main>',
        '14 |',
        '15 | export const BROKEN = (((',
        '   |                       ^',
      ].join('\n'),
      loc: {
        file: '/Users/me/app/src/routes/index.tsx',
        line: 15,
        column: 27,
      },
    },
  },
}

/** A runtime error with a stack trace but no code frame. */
export const RuntimeError: Story = {
  args: {
    err: {
      message: 'useState is not defined',
      stack: [
        'ReferenceError: useState is not defined',
        '    at IndexPage (/src/routes/index.tsx:9:20)',
        '    at renderWithHooks (/deps/react-dom_client.js:12042:26)',
        '    at mountIndeterminateComponent (/deps/react-dom_client.js:16856:13)',
      ].join('\n'),
      id: '/Users/me/app/src/routes/index.tsx',
      loc: {
        file: '/Users/me/app/src/routes/index.tsx',
        line: 9,
        column: 20,
      },
    },
  },
}
