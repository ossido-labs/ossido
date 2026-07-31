import type { JSX } from 'react'

import type { DevBuildError } from './devErrorStore'

/**
 * Renders a Vite build/compile error (reported into the store by the patched
 * Vite HMR client). Shows the message, the offending file/location, and Vite's
 * code frame — the same information Vite's native overlay would, but inside the
 * unified tuono overlay.
 */
export function DevBuildErrorContent({
  build,
}: {
  build: DevBuildError
}): JSX.Element {
  const file = build.loc?.file ?? build.id
  const location =
    build.loc?.line != null
      ? `${file}:${build.loc.line}:${build.loc.column ?? 0}`
      : file

  return (
    <>
      <span className="tuono-err-badge">Build error</span>
      <h1 className="tuono-err-name">
        {build.plugin ? `[plugin: ${build.plugin}] ` : ''}
        Failed to compile
      </h1>
      <div className="tuono-err-message-card">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
          <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 112C205.1 112 112 205.1 112 320C112 434.9 205.1 528 320 528C434.9 528 528 434.9 528 320C528 205.1 434.9 112 320 112zM348 444L292 444L292 388L348 388L348 444zM339.2 352L300.8 352L288 192L352 192L339.2 352z" />
        </svg>
        <p className="tuono-err-message">{build.message}</p>
      </div>

      {location && (
        <div className="tuono-err-source">
          <div className="tuono-err-source-file">{location}</div>
          {build.frame && (
            <pre className="tuono-err-frame-code">{build.frame.trimEnd()}</pre>
          )}
        </div>
      )}

      {!location && build.frame && (
        <pre className="tuono-err-frame-code">{build.frame.trimEnd()}</pre>
      )}

      {build.stack && !build.frame && (
        <pre className="tuono-err-rawstack">{build.stack}</pre>
      )}
    </>
  )
}
