import { useState } from 'react'
import type { JSX } from 'react'

/**
 * Test harness for the dev error overlay. Each button triggers a different kind
 * of error the overlay handles, so the e2e suite (and a human running
 * `tuono dev`) can exercise the overlay, its pager, and dismiss-to-badge.
 *
 * @see e2e/fixtures/base/tests/error-overlay.spec.ts
 */

/** Throws during render — caught by the route error boundary (a runtime error). */
function Bomb(): never {
  throw new Error('Render error: a component threw during render')
}

export default function ThrowsPage(): JSX.Element {
  const [renderError, setRenderError] = useState(false)

  return (
    <div>
      <h1>Throws</h1>

      <button
        type="button"
        data-testid="throw-render"
        onClick={(): void => setRenderError(true)}
      >
        Throw a render error
      </button>

      <button
        type="button"
        data-testid="throw-uncaught"
        onClick={(): void => {
          setTimeout(() => {
            throw new Error('Uncaught error from a setTimeout callback')
          }, 0)
        }}
      >
        Throw an uncaught error
      </button>

      <button
        type="button"
        data-testid="throw-rejection"
        onClick={(): void => {
          void Promise.reject(new Error('Unhandled promise rejection'))
        }}
      >
        Reject a promise
      </button>

      {renderError && <Bomb />}
    </div>
  )
}
