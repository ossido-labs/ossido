import { useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'

import type { TuonoErrorProps, TuonoErrorWithSource } from '../types'

import type { ResolvedDevError, ResolvedFrame } from './devErrorSource'
import {
  buildServerSourceExcerpt,
  errorLabel,
  initialFrames,
  resolveDevError,
} from './devErrorSource'
import { SYNTAX_THEME_CSS } from './devErrorTheme'
import { BaseStyles } from './BaseStyles'

/**
 * Development-only error overlay, inspired by `youch`. Shows the error name and
 * message, a syntax-highlighted "source window" around the expression that threw
 * (resolved to original source through sourcemaps), and the stack trace mapped
 * to original locations (application frames highlighted).
 *
 * Never used in production — {@link RouteMatch} selects the production fallback
 * instead, so source and internals are not leaked to end users.
 */

// Uses the shared design tokens from base.css (injected by <BaseStyles>). Body
// text is the sans token; code/stack content is switched to the mono token.
const STYLES = `
.tuono-err-root {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  overflow: auto;
  padding: var(--tuono-space-8);
  background: var(--tuono-color-bg);
  color: var(--tuono-color-text);
  font-family: var(--tuono-font-sans);
  font-size: var(--tuono-font-size);
  line-height: var(--tuono-line-height);
}
.tuono-err-card { max-width: 960px; margin: 0 auto; }
.tuono-err-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--tuono-radius-pill);
  background: var(--tuono-color-accent);
  color: var(--tuono-color-on-accent);
  font-size: var(--tuono-font-size-xs);
  font-weight: var(--tuono-font-weight-bold);
  letter-spacing: var(--tuono-letter-spacing-wide);
  text-transform: uppercase;
}
.tuono-err-name {
  margin: var(--tuono-space-3) 0 var(--tuono-space-4);
  font-size: var(--tuono-font-size-xl);
  font-weight: var(--tuono-font-weight-bold);
  color: var(--tuono-color-accent-text);
  word-break: break-word;
}
.tuono-err-message-card {
  border: 1px solid var(--tuono-color-border);
  border-radius: var(--tuono-radius);
  background: var(--tuono-color-surface);
  padding: 14px;
  margin-bottom: var(--tuono-space-6);
  gap: var(--tuono-space-2);
  display: flex;
}
.tuono-err-message-card svg {
  width: 1.5rem;
  height: 1.5rem;
  fill: var(--tuono-color-accent-text);
}
.tuono-err-message {
  margin: 0;
  color: var(--tuono-color-accent-text);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5rem;
  font-size: 1rem;
}
/* Apply the sans token to every overlay element (not just the root): a 0-1-0
 * selector beats an app-level "* { font-family: ... }" reset (0-0-0), which
 * would otherwise override the value inherited from the root on each child. */
.tuono-err-root * {
  font-family: var(--tuono-font-sans);
}
/* Switch code/stack content to the monospace token. Same specificity (0-1-0)
 * as the rule above but later in source order, so it wins for these subtrees. */
.tuono-err-source,
.tuono-err-source *,
.tuono-err-stack,
.tuono-err-stack *,
.tuono-err-rawstack {
  font-family: var(--tuono-font-mono);
}
.tuono-err-source {
  border: 1px solid var(--tuono-color-border);
  border-radius: var(--tuono-radius);
  overflow: hidden;
  margin-bottom: var(--tuono-space-6);
}
.tuono-err-source-file {
  padding: 8px 14px;
  background: var(--tuono-color-surface);
  border-bottom: 1px solid var(--tuono-color-border);
  color: var(--tuono-color-text-muted);
  font-size: var(--tuono-font-size-sm);
  word-break: break-all;
}
.tuono-err-code { margin: 0; overflow-x: auto; }
.tuono-err-code-line { display: flex; white-space: pre; }
.tuono-err-code-line--error { background: var(--tuono-color-danger-surface); }
.tuono-err-gutter {
  width: 3.5rem;
  flex: none;
  padding: 0 12px;
  text-align: right;
  color: var(--tuono-color-text-faint);
  user-select: none;
}
.tuono-err-code-line--error .tuono-err-gutter { color: var(--tuono-color-accent-text); }
.tuono-err-code-text { padding-right: 14px; color: var(--tuono-color-text); }
.tuono-err-rawstack {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--tuono-color-border);
  border-radius: var(--tuono-radius);
  overflow-x: auto;
  color: var(--tuono-color-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
}
.tuono-err-stack { border: 1px solid var(--tuono-color-border); border-radius: var(--tuono-radius); overflow: hidden; }
.tuono-err-frame { padding: 8px 14px; border-top: 1px solid var(--tuono-color-border); }
.tuono-err-frame:first-child { border-top: none; }
.tuono-err-frame--app { background: var(--tuono-color-surface); }
.tuono-err-frame--vendor { opacity: 0.55; }
.tuono-err-fn { color: var(--tuono-color-text); }
.tuono-err-loc { color: var(--tuono-color-text-subtle); font-size: var(--tuono-font-size-sm); word-break: break-all; }
.tuono-err-actions { margin-top: var(--tuono-space-6); }
.tuono-err-btn {
  padding: 6px 16px;
  border: 1px solid var(--tuono-color-border-strong);
  border-radius: var(--tuono-radius-sm);
  background: var(--tuono-color-surface-raised);
  color: var(--tuono-color-text);
  font: inherit;
  cursor: pointer;
}
.tuono-err-btn:hover { background: var(--tuono-color-surface-hover); }
.tuono-err-hint { margin-top: var(--tuono-space-4); color: var(--tuono-color-text-faint); font-size: var(--tuono-font-size-xs); }
.tuono-err-frame-toggle {
  display: block;
  width: 100%;
  padding: 8px 14px;
  text-align: left;
  border: none;
  border-top: 1px solid var(--tuono-color-border);
  background: var(--tuono-color-surface-raised);
  color: var(--tuono-color-text-subtle);
  font: inherit;
  font-size: var(--tuono-font-size-sm);
  cursor: pointer;
}
.tuono-err-frame-toggle:hover { background: var(--tuono-color-surface-hover); }
.tuono-err-frame-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.tuono-err-frame-badge {
  flex: none;
  padding: 0 10px;
  border-radius: var(--tuono-radius-pill);
  background: var(--tuono-color-success-surface);
  border: 1px solid var(--tuono-color-success);
  color: var(--tuono-color-success-text);
  font-family: var(--tuono-font-sans);
  font-size: var(--tuono-font-size-xs);
  font-weight: var(--tuono-font-weight-bold);
  letter-spacing: var(--tuono-letter-spacing-wide);
  text-transform: uppercase;
  white-space: nowrap;
}
`

/** Stack frames shown before the "show more" toggle is expanded. */
const MAX_VISIBLE_FRAMES = 5

/**
 * Whether a frame points at the app's own source — a non-vendor frame whose
 * (resolved) path sits under a `src/` directory. The `isApp` guard keeps a
 * dependency's own `src/` (e.g. `node_modules/foo/src/…`) from matching.
 */
function isAppSourceFrame(frame: ResolvedFrame): boolean {
  return frame.isApp && !!frame.file && /(^|\/)src\//.test(frame.file)
}

export function DevErrorOverlay({
  error,
  reset,
}: TuonoErrorProps): JSX.Element {
  const [resolved, setResolved] = useState<ResolvedDevError | null>(null)
  // Long stacks are collapsed to the first few frames until expanded.
  const [framesExpanded, setFramesExpanded] = useState(false)

  // Frames available synchronously for the first paint; replaced once the stack
  // is mapped to original source locations.
  const fallbackFrames = useMemo(
    () => initialFrames(error.stack),
    [error.stack],
  )

  useEffect(() => {
    let cancelled = false

    const resolve = async (): Promise<void> => {
      // A Rust panic ships its own source (no sourcemap exists): highlight that
      // directly and take frames from the stack. Otherwise resolve JS frames and
      // excerpt through sourcemaps.
      const serverSource = (error as TuonoErrorWithSource).tuonoServerSource
      if (serverSource) {
        const excerpt = await buildServerSourceExcerpt(serverSource)
        if (!cancelled)
          setResolved({ frames: initialFrames(error.stack), excerpt })
        return
      }

      const result = await resolveDevError(error.stack)
      if (!cancelled) setResolved(result)
    }
    void resolve()

    return (): void => {
      cancelled = true
    }
  }, [error])

  const frames = resolved?.frames ?? fallbackFrames
  const excerpt = resolved?.excerpt ?? null
  const hiddenFrameCount = Math.max(0, frames.length - MAX_VISIBLE_FRAMES)
  const visibleFrames = framesExpanded
    ? frames
    : frames.slice(0, MAX_VISIBLE_FRAMES)
  // The constructor (class) name, shown on its own line under the badge.
  const label = errorLabel(error)

  return (
    <div className="tuono-err-root" role="alert">
      <BaseStyles />
      <style>{STYLES}</style>
      <style>{SYNTAX_THEME_CSS}</style>
      <div className="tuono-err-card">
        <span className="tuono-err-badge">Error</span>
        <h1 className="tuono-err-name">{label}</h1>
        <div className="tuono-err-message-card">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 112C205.1 112 112 205.1 112 320C112 434.9 205.1 528 320 528C434.9 528 528 434.9 528 320C528 205.1 434.9 112 320 112zM348 444L292 444L292 388L348 388L348 444zM339.2 352L300.8 352L288 192L352 192L339.2 352z" />
          </svg>
          <p className="tuono-err-message">{error.message}</p>
        </div>

        {excerpt && (
          <div className="tuono-err-source">
            <div className="tuono-err-source-file">
              {excerpt.file}:{excerpt.line}:{excerpt.column}
            </div>
            <pre className="tuono-err-code">
              {excerpt.lines.map((sourceLine) => (
                <div
                  key={sourceLine.number}
                  className={
                    sourceLine.isErrorLine
                      ? 'tuono-err-code-line tuono-err-code-line--error'
                      : 'tuono-err-code-line'
                  }
                >
                  <span className="tuono-err-gutter">{sourceLine.number}</span>
                  <span
                    className="tuono-err-code-text"
                    // Highlighted markup produced by starry-night (trusted).
                    dangerouslySetInnerHTML={{ __html: sourceLine.html }}
                  />
                </div>
              ))}
            </pre>
          </div>
        )}

        {frames.length === 0 && error.stack && (
          <pre className="tuono-err-rawstack">{error.stack}</pre>
        )}

        {frames.length > 0 && (
          <div className="tuono-err-stack">
            {visibleFrames.map((frame, index) => (
              <div
                key={index}
                className={
                  frame.isApp
                    ? 'tuono-err-frame tuono-err-frame--app'
                    : 'tuono-err-frame tuono-err-frame--vendor'
                }
              >
                <div className="tuono-err-frame-head">
                  <span className="tuono-err-fn">
                    {frame.fn ?? '<anonymous>'}
                  </span>
                  {isAppSourceFrame(frame) && (
                    <span className="tuono-err-frame-badge">app</span>
                  )}
                </div>
                {frame.file && (
                  <div className="tuono-err-loc">
                    {frame.file}
                    {frame.line != null && `:${frame.line}:${frame.column}`}
                  </div>
                )}
              </div>
            ))}
            {hiddenFrameCount > 0 && (
              <button
                type="button"
                className="tuono-err-frame-toggle"
                onClick={(): void => {
                  setFramesExpanded((expanded) => !expanded)
                }}
                aria-expanded={framesExpanded}
              >
                {framesExpanded
                  ? 'Show fewer frames'
                  : `Show ${hiddenFrameCount} more frame${hiddenFrameCount === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
        )}

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
  )
}
