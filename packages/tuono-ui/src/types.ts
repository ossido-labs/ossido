import type { ComponentType } from 'react'

/**
 * The panic-site source file, embedded by the server (dev only) so the overlay
 * can show a highlighted excerpt — Rust has no sourcemap to resolve one from.
 * @see crates/tuono_lib/src/server_error.rs (`ErrorSource`)
 */
export interface ServerErrorSource {
  file: string
  line: number
  column: number
  content: string
}

/**
 * An `Error` carrying the server-provided panic-site source, used by the overlay
 * to render the excerpt. Attached by `serverErrorToError` in tuono-router.
 */
export interface TuonoErrorWithSource extends Error {
  tuonoServerSource?: ServerErrorSource
}

/** Props passed to a user `error.tsx` component (and the default error UI). */
export interface TuonoErrorProps {
  error: Error
  reset: () => void
}

/** An `error.tsx` component. Rendered by the route error boundary. */
export type ErrorComponent = ComponentType<TuonoErrorProps>
