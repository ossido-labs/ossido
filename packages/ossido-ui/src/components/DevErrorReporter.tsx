import { useEffect } from 'react';

import type { OssidoErrorProps } from '../types';

import { devErrorStore } from './devErrorStore';

/**
 * Development-only error-boundary fallback. Instead of rendering the overlay in
 * place of the failed subtree (which reads as a full-page replacement), it
 * reports the caught render error — including SSR/Rust panics surfaced through
 * a rejected data resource — to the shared {@link devErrorStore}. The floating
 * {@link DevErrorOverlayHost} then shows it over the app, with the boundary's
 * `reset` wired to the overlay's "Try again".
 *
 * Renders nothing itself; the route area stays blank behind the overlay until
 * the error is fixed or retried (matching Vite/Next).
 */
export function DevErrorReporter({ error, reset }: OssidoErrorProps): null {
  useEffect(() => {
    const id = devErrorStore.addJsError('runtime', error, reset);
    return (): void => {
      devErrorStore.removeById(id);
    };
  }, [error, reset]);

  return null;
}
