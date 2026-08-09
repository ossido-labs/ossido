import type { ComponentType } from 'react';

/**
 * The panic-site source file, embedded by the server (dev only) so the overlay
 * can show a highlighted excerpt — Rust has no sourcemap to resolve one from.
 * @see crates/ossido/src/server_error.rs (`ErrorSource`)
 */
export interface ServerErrorSource {
  file: string;
  line: number;
  column: number;
  content: string;
}

/**
 * An `Error` carrying the server-provided panic-site source, used by the overlay
 * to render the excerpt. Attached by `serverErrorToError` in ossido-router.
 */
export interface OssidoErrorWithSource extends Error {
  ossidoServerSource?: ServerErrorSource;
}

/** Props passed to a user `error.tsx` component (and the default error UI). */
export interface OssidoErrorProps {
  error: Error;
  reset: () => void;
}

/** An `error.tsx` component. Rendered by the route error boundary. */
export type ErrorComponent = ComponentType<OssidoErrorProps>;
