import { useEffect, useState, useSyncExternalStore } from 'react'
import type { JSX } from 'react'
import { createPortal } from 'react-dom'

import { BaseStyles } from './BaseStyles'
import { DevErrorContent } from './DevErrorContent'
import { DevBuildErrorContent } from './DevBuildErrorContent'
import { DEV_ERROR_STYLES } from './devErrorStyles'
import type {
  DevErrorEntry,
  DevErrorKind,
  DevOverlayCorner,
} from './devErrorStore'
import { DEV_OVERLAY_CORNERS, devErrorStore } from './devErrorStore'

/**
 * Development-only host for the unified error overlay and its persistent dev
 * indicator. Mounted once at the router root (dev only), it subscribes to
 * {@link devErrorStore} and renders:
 *
 * - a persistent corner **indicator** (always visible in dev) whose menu offers
 *   "View errors", a corner picker (persisted), and "Hide until reload", and
 * - the **error overlay** itself — a browsable window for every kind of dev
 *   error (React render errors, SSR/Rust panics, uncaught errors, unhandled
 *   rejections, Vite build errors), auto-opened when a new error arrives.
 *
 * Never rendered in production: {@link RouteMatch} only mounts it in dev, so no
 * source or internals leak to end users.
 */

const KIND_LABEL: Record<DevErrorKind, string> = {
  runtime: 'Runtime error',
  uncaught: 'Uncaught error',
  unhandledrejection: 'Unhandled rejection',
  build: 'Build error',
}

const CORNER_LABEL: Record<DevOverlayCorner, string> = {
  'top-left': 'Top left',
  'top-right': 'Top right',
  'bottom-left': 'Bottom left',
  'bottom-right': 'Bottom right',
}

/**
 * React dispatches these to `window` when server rendering fails and it recovers
 * by client-rendering (or when hydration falls back). They carry no stack and
 * aren't actionable — the underlying error is already reported by the route
 * boundary — so they are dropped to avoid a duplicate, contentless entry.
 */
const IGNORED_UNCAUGHT_MESSAGES = [
  'could not finish this Suspense boundary',
  'Switched to client rendering',
  'error during server rendering',
  'hydrating but received',
]

function isIgnorableUncaught(error: Error): boolean {
  return IGNORED_UNCAUGHT_MESSAGES.some((needle) =>
    error.message.includes(needle),
  )
}

/** Normalize an unhandled rejection reason into an `Error`. */
function toError(reason: unknown): Error {
  if (reason instanceof Error) return reason
  const error = new Error(
    typeof reason === 'string' ? reason : JSON.stringify(reason),
  )
  error.name = 'UnhandledRejection'
  return error
}

function Styles(): JSX.Element {
  return (
    <>
      <BaseStyles />
      <style>{DEV_ERROR_STYLES}</style>
    </>
  )
}

function EntryBody({ entry }: { entry: DevErrorEntry }): JSX.Element | null {
  if (entry.kind === 'build' && entry.build) {
    return <DevBuildErrorContent build={entry.build} />
  }
  if (entry.error) {
    // Keyed by entry id so paging to a different error remounts with fresh
    // resolution state (but a re-render of the same entry does not).
    return <DevErrorContent key={entry.id} error={entry.error} />
  }
  return null
}

function ChevronLeftIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

/** The same lightning bolt Tuono prints in the console. */
function BoltIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" />
    </svg>
  )
}

function DevErrorOverlay({ count }: { count: number }): JSX.Element {
  const state = devErrorStore.getSnapshot()
  const activeIndex = Math.min(state.activeIndex, count - 1)
  const entry = state.entries[activeIndex] as DevErrorEntry

  return (
    <div
      className="tuono-err-backdrop"
      role="alertdialog"
      aria-modal="true"
      onClick={(): void => devErrorStore.closeOverlay()}
    >
      <Styles />
      {/* Clicks inside the window must not fall through to the backdrop. */}
      <div
        className="tuono-err-window"
        onClick={(event): void => event.stopPropagation()}
      >
        <div className="tuono-err-pager">
          <button
            type="button"
            className="tuono-err-nav"
            aria-label="Previous error"
            disabled={count < 2}
            onClick={(): void => devErrorStore.prev()}
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className="tuono-err-nav"
            aria-label="Next error"
            disabled={count < 2}
            onClick={(): void => devErrorStore.next()}
          >
            <ChevronRightIcon />
          </button>
          <span className="tuono-err-pager-count">
            {activeIndex + 1} of {count}
          </span>
          <span className="tuono-err-pager-kind">{KIND_LABEL[entry.kind]}</span>
          {entry.occurrences > 1 && (
            <span
              className="tuono-err-pager-occurrences"
              title={`Reported ${entry.occurrences} times`}
            >
              ×{entry.occurrences}
            </span>
          )}
          <span className="tuono-err-pager-spacer" />
          <button
            type="button"
            className="tuono-err-dismiss"
            aria-label="Dismiss"
            onClick={(): void => devErrorStore.closeOverlay()}
          >
            ✕
          </button>
        </div>

        <div className="tuono-err-body">
          <EntryBody entry={entry} />

          {entry.reset && (
            <div className="tuono-err-actions">
              <button
                type="button"
                className="tuono-err-btn"
                onClick={entry.reset}
              >
                Try again
              </button>
            </div>
          )}
          <p className="tuono-err-hint">
            This overlay is only shown in development. Press <kbd>Esc</kbd> or
            click outside to dismiss.
          </p>
        </div>
      </div>
    </div>
  )
}

function DevIndicator({
  count,
  menuOpen,
  position,
}: {
  count: number
  menuOpen: boolean
  position: DevOverlayCorner
}): JSX.Element {
  return (
    <>
      {menuOpen && (
        <div
          className="tuono-err-menu-scrim"
          onClick={(): void => devErrorStore.closeMenu()}
        />
      )}
      <div className={`tuono-err-indicator tuono-err-indicator--${position}`}>
        {menuOpen && (
          <div
            className={`tuono-err-menu tuono-err-menu--${position}`}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className="tuono-err-menu-item"
              disabled={count === 0}
              onClick={(): void => devErrorStore.openOverlay()}
            >
              <span>View errors</span>
              {count > 0 ? (
                <span className="tuono-err-menu-count">{count}</span>
              ) : (
                <span className="tuono-err-menu-muted">None</span>
              )}
            </button>

            <div className="tuono-err-menu-sep" />

            <div className="tuono-err-menu-section">
              <span className="tuono-err-menu-label">Position</span>
              <div className="tuono-err-menu-corners">
                {DEV_OVERLAY_CORNERS.map((corner) => (
                  <button
                    key={corner}
                    type="button"
                    className={
                      corner === position
                        ? 'tuono-err-corner tuono-err-corner--active'
                        : 'tuono-err-corner'
                    }
                    aria-label={CORNER_LABEL[corner]}
                    aria-pressed={corner === position}
                    onClick={(): void => devErrorStore.setPosition(corner)}
                  >
                    <span
                      className={`tuono-err-corner-dot tuono-err-corner-dot--${corner}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="tuono-err-menu-sep" />

            <button
              type="button"
              role="menuitem"
              className="tuono-err-menu-item"
              onClick={(): void => devErrorStore.hideBadge()}
            >
              <span>Hide until reload</span>
            </button>
          </div>
        )}

        <button
          type="button"
          className="tuono-err-fab"
          aria-label="Tuono dev tools"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(): void => devErrorStore.toggleMenu()}
        >
          <BoltIcon />
          {count > 0 && <span className="tuono-err-fab-count">{count}</span>}
        </button>
      </div>
    </>
  )
}

export function DevErrorOverlayHost(): JSX.Element | null {
  const state = useSyncExternalStore(
    devErrorStore.subscribe,
    devErrorStore.getSnapshot,
    devErrorStore.getServerSnapshot,
  )

  // The indicator is a client-only portal, so it renders nothing until after
  // mount. This keeps the hydration render identical to the server (which
  // renders nothing), avoiding a hydration mismatch now that the badge is shown
  // even with zero errors.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Collect uncaught errors and unhandled rejections (React render errors and
  // build errors arrive through their own channels). The source-highlighting
  // libraries are prefetched at dev bootstrap (see the hydration entry).
  useEffect(() => {
    const onError = (event: ErrorEvent): void => {
      const error =
        event.error instanceof Error ? event.error : new Error(event.message)
      if (isIgnorableUncaught(error)) return
      devErrorStore.addJsError('uncaught', error)
    }
    const onRejection = (event: PromiseRejectionEvent): void => {
      devErrorStore.addJsError('unhandledrejection', toError(event.reason))
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return (): void => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  // Esc closes the overlay (or the indicator menu).
  useEffect(() => {
    if (!state.overlayOpen && !state.menuOpen) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (state.overlayOpen) devErrorStore.closeOverlay()
      else devErrorStore.closeMenu()
    }
    document.addEventListener('keydown', onKeyDown)
    return (): void => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [state.overlayOpen, state.menuOpen])

  if (typeof document === 'undefined' || !mounted) return null

  const count = state.entries.length

  // A new error auto-opens the full overlay.
  if (state.overlayOpen && count > 0) {
    return createPortal(
      <>
        <Styles />
        <DevErrorOverlay count={count} />
      </>,
      document.body,
    )
  }

  // Otherwise the persistent indicator — hidden only when the user hid it for
  // this session AND there are no errors to surface.
  if (state.badgeHidden && count === 0) return null

  return createPortal(
    <>
      <Styles />
      <DevIndicator
        count={count}
        menuOpen={state.menuOpen}
        position={state.position}
      />
    </>,
    document.body,
  )
}
