import { Component, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import type { OssidoErrorWithSource } from '../types'

import { DevErrorOverlay } from './DevErrorOverlay'
import { DefaultScreen } from './DefaultScreen'

const jsError = new Error('Cannot read properties of undefined (reading "map")')
jsError.stack = `TypeError: Cannot read properties of undefined (reading "map")
    at IndexPage (http://localhost:3101/vite-server/@fs/Users/me/app/src/routes/index.tsx:12:24)
    at renderWithHooks (http://localhost:3101/vite-server/deps/react-dom_client.js?v=abc:4392:19)`

// A deep stack (> 5 frames) to exercise the "show more frames" toggle.
const longStackError = new Error(
  'Cannot read properties of undefined (reading "map")',
)
longStackError.stack = [
  'TypeError: Cannot read properties of undefined (reading "map")',
  '    at PokemonList (http://localhost:3101/vite-server/@fs/Users/me/app/src/components/PokemonList.tsx:18:22)',
  '    at IndexPage (http://localhost:3101/vite-server/@fs/Users/me/app/src/routes/index.tsx:12:24)',
  '    at renderWithHooks (http://localhost:3101/vite-server/deps/react-dom_client.js?v=abc:4392:19)',
  '    at mountIndeterminateComponent (http://localhost:3101/vite-server/deps/react-dom_client.js?v=abc:5867:13)',
  '    at beginWork (http://localhost:3101/vite-server/deps/react-dom_client.js?v=abc:6486:16)',
  '    at performUnitOfWork (http://localhost:3101/vite-server/deps/react-dom_client.js?v=abc:8916:12)',
  '    at workLoopSync (http://localhost:3101/vite-server/deps/react-dom_client.js?v=abc:8837:9)',
  '    at renderRootSync (http://localhost:3101/vite-server/deps/react-dom_client.js?v=abc:8810:11)',
].join('\n')

const rustError: OssidoErrorWithSource = new Error(
  'Boom! This panic was raised inside a Rust route handler',
)
rustError.name = 'RustPanic'
rustError.stack = [
  '    at src/routes/rust-error.rs:8:5',
  '   4: ossido_app::routes::rust_error::{{closure}}',
  '             at src/routes/rust-error.rs:8:5',
  '   5: core::panicking::panic_fmt',
  '             at /rustc/abc/library/core/src/panicking.rs:80:14',
].join('\n')
rustError.ossidoServerSource = {
  file: 'src/routes/rust-error.rs',
  line: 8,
  column: 5,
  content: [
    'use ossido::{Request, Response};',
    '',
    '#[ossido::handler]',
    'async fn rust_error(_req: Request) -> Response {',
    '    panic!("Boom! This panic was raised inside a Rust route handler");',
    '}',
    '',
  ].join('\n'),
}

// #region Interactive trigger
/** Throws during render — the point of the "Triggered" story. */
function Bomb(): never {
  throw new Error('Cannot read properties of null (reading "toUpperCase")')
}

interface DemoBoundaryProps {
  onReset: () => void
  children: ReactNode
}

/**
 * A minimal error boundary, standing in for the router's `OssidoErrorBoundary`,
 * so the story shows the real flow: a descendant throws → the boundary catches
 * it → the overlay renders. `reset` is wired to the overlay's "Try again".
 */
class DemoBoundary extends Component<
  DemoBoundaryProps,
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <DevErrorOverlay error={this.state.error} reset={this.props.onReset} />
      )
    }
    return this.props.children
  }
}

function TriggerDemo(): JSX.Element {
  // Bumping `attempt` re-mounts the boundary (clearing its caught error), the
  // same trick RouteMatch uses to reset via the resource key.
  const [attempt, setAttempt] = useState(0)
  const [armed, setArmed] = useState(false)

  const reset = (): void => {
    setArmed(false)
    setAttempt((n) => n + 1)
  }

  return (
    <DemoBoundary key={attempt} onReset={reset}>
      {armed ? (
        <Bomb />
      ) : (
        <DefaultScreen badge="Demo" title="Dev error overlay">
          <p className="ossido-screen-text">
            Throw an error from a React render and watch the boundary catch it.
          </p>
          <button
            type="button"
            className="ossido-screen-action"
            onClick={(): void => setArmed(true)}
          >
            Throw a render error
          </button>
        </DefaultScreen>
      )}
    </DemoBoundary>
  )
}
// #endregion

const meta = {
  title: 'Default Screens/DevErrorOverlay',
  component: DevErrorOverlay,
  parameters: { layout: 'fullscreen' },
  args: { reset: (): void => undefined, error: jsError },
} satisfies Meta<typeof DevErrorOverlay>

export default meta
type Story = StoryObj<typeof meta>

/** A JavaScript error — frames resolve to app source via sourcemaps. */
export const JavaScriptError: Story = {
  args: { error: jsError },
}

/** A Rust handler panic — the server-embedded source excerpt is highlighted. */
export const RustPanic: Story = {
  args: { error: rustError },
}

/** A deep stack: only the first 5 frames show until "show more frames". */
export const LongStack: Story = {
  args: { error: longStackError },
}

/** Interactive: click the button to throw a real render error into a boundary. */
export const Triggered: Story = {
  render: (): JSX.Element => <TriggerDemo />,
}
