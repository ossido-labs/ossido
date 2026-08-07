import { useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'

import type { OssidoErrorWithSource } from '../types'

import type {
  PlainExcerpt,
  ResolvedFrame,
  SourceExcerpt,
} from './devErrorSource'
import {
  errorLabel,
  extractExcerpt,
  highlightExcerpt,
  initialFrames,
  prettyPath,
  resolveDevErrorFrames,
} from './devErrorSource'

/**
 * Renders the details of a single JS error (a React render error, uncaught
 * `window` error, or unhandled rejection): the error name and message, a source
 * window around the throwing expression (resolved to original source through
 * sourcemaps), and the stack trace mapped to original locations with application
 * frames highlighted.
 *
 * The excerpt renders as **plain text as soon as the source content is
 * available** (immediately for a server-provided Rust panic; after the sourcemap
 * fetch for a JS error), then syntax highlighting swaps in over the exact same
 * layout — so there is no blank-then-appear jump.
 *
 * This is the inner content only — the window chrome, pager and actions live in
 * {@link DevErrorOverlayHost}. It is remounted per error (keyed by entry id) so
 * its resolution state starts fresh.
 */

/** Stack frames shown before the "show more" toggle is expanded. */
const MAX_VISIBLE_FRAMES = 5

/** Rows the excerpt spans (SOURCE_CONTEXT * 2 + 1) — the skeleton matches it so
 * the real excerpt drops into already-reserved space (no layout jump). */
const EXCERPT_ROWS = 11

/**
 * A fixed-height placeholder rendered while a JS error's excerpt is still being
 * resolved (the sourcemap has to be fetched first). It reserves exactly the
 * excerpt's height so the resolved code doesn't shove the stack down when it
 * arrives.
 */
function ExcerptSkeleton(): JSX.Element {
  return (
    <div className="ossido-err-source" aria-hidden>
      <div className="ossido-err-source-file">&nbsp;</div>
      <pre className="ossido-err-code">
        {Array.from({ length: EXCERPT_ROWS }, (_, index) => (
          <div key={index} className="ossido-err-code-line">
            <span className="ossido-err-gutter" />
            <span className="ossido-err-code-text">
              <span
                className="ossido-err-skel-bar"
                // `ch` (not `%`): the code-text is an inline flex item with no
                // resolvable width, so a percentage would collapse to zero.
                style={{ width: `${10 + ((index * 13) % 34)}ch` }}
              />
            </span>
          </div>
        ))}
      </pre>
    </div>
  )
}

/**
 * Whether a frame points at the app's own source — a non-vendor frame whose
 * (resolved) path sits under a `src/` directory. The `isApp` guard keeps a
 * dependency's own `src/` (e.g. `node_modules/foo/src/…`) from matching.
 */
function isAppSourceFrame(frame: ResolvedFrame): boolean {
  return frame.isApp && !!frame.file && /(^|\/)src\//.test(frame.file)
}

export function DevErrorContent({ error }: { error: Error }): JSX.Element {
  // Long stacks are collapsed to the first few frames until expanded.
  const [framesExpanded, setFramesExpanded] = useState(false)

  // A Rust panic ships its own source (no sourcemap exists), so its plain
  // excerpt is available synchronously on the very first paint.
  const serverSource = (error as OssidoErrorWithSource).ossidoServerSource
  const initialPlain = useMemo<PlainExcerpt | null>(
    () =>
      serverSource
        ? extractExcerpt({
            content: serverSource.content,
            file: prettyPath(serverSource.file),
            line: serverSource.line,
            column: serverSource.column,
          })
        : null,
    [serverSource],
  )

  const [frames, setFrames] = useState<Array<ResolvedFrame>>(() =>
    initialFrames(error.stack),
  )
  const [plain, setPlain] = useState<PlainExcerpt | null>(initialPlain)
  const [highlighted, setHighlighted] = useState<SourceExcerpt | null>(null)

  // Whether an excerpt is likely coming (a JS error with an application frame),
  // so its space can be reserved with a skeleton while the sourcemap resolves.
  const expectsExcerpt = useMemo(
    () =>
      !serverSource &&
      initialFrames(error.stack).some(
        (frame) => frame.isApp && !!frame.file && frame.line != null,
      ),
    [error.stack, serverSource],
  )

  useEffect(() => {
    let cancelled = false

    const resolve = async (): Promise<void> => {
      if (serverSource) {
        // The plain excerpt is already shown; just highlight it in place.
        const source = {
          content: serverSource.content,
          file: prettyPath(serverSource.file),
          line: serverSource.line,
          column: serverSource.column,
        }
        const result = await highlightExcerpt(source)
        if (!cancelled && result) setHighlighted(result)
        return
      }

      const { frames: resolvedFrames, source } = await resolveDevErrorFrames(
        error.stack,
      )
      if (cancelled) return
      setFrames(resolvedFrames)
      if (source) {
        // Plain excerpt first (no layout jump), highlighting swaps in after.
        setPlain(extractExcerpt(source))
        const result = await highlightExcerpt(source)
        if (!cancelled && result) setHighlighted(result)
      }
    }
    void resolve()

    return (): void => {
      cancelled = true
    }
  }, [error, serverSource])

  // Prefer the highlighted excerpt once ready; both share the same line/gutter
  // structure, so swapping in the colours does not shift the layout.
  const excerpt: SourceExcerpt | PlainExcerpt | null = highlighted ?? plain
  const hiddenFrameCount = Math.max(0, frames.length - MAX_VISIBLE_FRAMES)
  const visibleFrames = framesExpanded
    ? frames
    : frames.slice(0, MAX_VISIBLE_FRAMES)
  // The constructor (class) name, shown on its own line under the badge.
  const label = errorLabel(error)

  return (
    <>
      <span className="ossido-err-badge">Error</span>
      <h1 className="ossido-err-name">{label}</h1>
      <div className="ossido-err-message-card">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
          <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 112C205.1 112 112 205.1 112 320C112 434.9 205.1 528 320 528C434.9 528 528 434.9 528 320C528 205.1 434.9 112 320 112zM348 444L292 444L292 388L348 388L348 444zM339.2 352L300.8 352L288 192L352 192L339.2 352z" />
        </svg>
        <p className="ossido-err-message">{error.message}</p>
      </div>

      {excerpt ? (
        <div className="ossido-err-source">
          <div className="ossido-err-source-file">
            {excerpt.file}:{excerpt.line}:{excerpt.column}
          </div>
          <pre className="ossido-err-code">
            {excerpt.lines.map((sourceLine) => (
              <div
                key={sourceLine.number}
                className={
                  sourceLine.isErrorLine
                    ? 'ossido-err-code-line ossido-err-code-line--error'
                    : 'ossido-err-code-line'
                }
              >
                <span className="ossido-err-gutter">{sourceLine.number}</span>
                {'html' in sourceLine ? (
                  <span
                    className="ossido-err-code-text"
                    // Highlighted markup produced by Shiki (trusted).
                    dangerouslySetInnerHTML={{ __html: sourceLine.html }}
                  />
                ) : (
                  <span className="ossido-err-code-text">{sourceLine.text}</span>
                )}
              </div>
            ))}
          </pre>
        </div>
      ) : expectsExcerpt ? (
        <ExcerptSkeleton />
      ) : null}

      {frames.length === 0 && error.stack && (
        <pre className="ossido-err-rawstack">{error.stack}</pre>
      )}

      {frames.length > 0 && (
        <div className="ossido-err-stack">
          {visibleFrames.map((frame, index) => (
            <div
              key={index}
              className={
                frame.isApp
                  ? 'ossido-err-frame ossido-err-frame--app'
                  : 'ossido-err-frame ossido-err-frame--vendor'
              }
            >
              <div className="ossido-err-frame-head">
                <span className="ossido-err-fn">
                  {frame.fn ?? '<anonymous>'}
                </span>
                {isAppSourceFrame(frame) && (
                  <span className="ossido-err-frame-badge">app</span>
                )}
              </div>
              {frame.file && (
                <div className="ossido-err-loc">
                  {frame.file}
                  {frame.line != null && `:${frame.line}:${frame.column}`}
                </div>
              )}
            </div>
          ))}
          {hiddenFrameCount > 0 && (
            <button
              type="button"
              className="ossido-err-frame-toggle"
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
    </>
  )
}
