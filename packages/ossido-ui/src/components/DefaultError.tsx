import type { JSX } from 'react'

import type { OssidoErrorProps } from '../types'

import { DefaultScreen } from './DefaultScreen'

/**
 * Production error fallback used when a route has no `error.tsx`. Deliberately
 * shows no error message, stack or source — those could leak internals — just a
 * friendly notice and a retry. The rich {@link DevErrorOverlay} is used in
 * development instead.
 */
export function DefaultError({ reset }: OssidoErrorProps): JSX.Element {
  return (
    <DefaultScreen role="alert" badge="Error" title="Something went wrong">
      <p className="ossido-screen-text">
        An unexpected error occurred. Please try again.
      </p>
      <button type="button" className="ossido-screen-action" onClick={reset}>
        Try again
      </button>
    </DefaultScreen>
  )
}
