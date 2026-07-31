import type { JSX } from 'react'

import type { TuonoErrorProps } from '../types'

import { BaseStyles } from './BaseStyles'
import { DevErrorContent } from './DevErrorContent'
import { SYNTAX_THEME_CSS } from './devErrorTheme'
import { DEV_ERROR_STYLES } from './devErrorStyles'

/**
 * Standalone single-error overlay window, presented as a floating window over a
 * dimmed backdrop. The live dev app uses {@link DevErrorOverlayHost} instead —
 * it is store-driven and browses every kind of dev error with a pager — but
 * this renders a single error directly, which is handy for stories and any
 * caller that already has one `Error` in hand.
 *
 * Never used in production: {@link RouteMatch} selects the detail-free
 * production fallback, so source and internals are not leaked to end users.
 */
export function DevErrorOverlay({
  error,
  reset,
}: TuonoErrorProps): JSX.Element {
  return (
    <div className="tuono-err-backdrop" role="alertdialog" aria-modal="true">
      <BaseStyles />
      <style>{DEV_ERROR_STYLES}</style>
      <style>{SYNTAX_THEME_CSS}</style>
      <div className="tuono-err-window">
        <div className="tuono-err-body">
          <DevErrorContent error={error} />
          <div className="tuono-err-actions">
            <button type="button" className="tuono-err-btn" onClick={reset}>
              Try again
            </button>
          </div>
          <p className="tuono-err-hint">
            This overlay is only shown in development.
          </p>
        </div>
      </div>
    </div>
  )
}
