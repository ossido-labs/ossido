import { flushSync } from 'react-dom';

declare const __OSSIDO_VIEW_TRANSITIONS__: boolean;

/**
 * Whether the app opted into view transitions at build time. Baked in via the
 * vite `define` (`__OSSIDO_VIEW_TRANSITIONS__`); `false` when the define is
 * absent (tests / SSR), keeping transitions opt-in.
 */
export const VIEW_TRANSITIONS_ENABLED =
  typeof __OSSIDO_VIEW_TRANSITIONS__ !== 'undefined' &&
  __OSSIDO_VIEW_TRANSITIONS__;

/** A `Document` that may expose the View Transitions API. */
interface ViewTransitionDocument {
  startViewTransition?: (callback: () => void) => unknown;
}

/**
 * Run a router `commit` inside `document.startViewTransition` when `enabled`, the
 * API is supported, and the user hasn't requested reduced motion — otherwise run
 * it directly.
 *
 * The commit's React state updates are wrapped in `flushSync` so the DOM shows
 * the new page before the API captures its "after" snapshot; React state updates
 * are async and wouldn't be applied in time otherwise. This is safe because the
 * router prefetches the destination's data + code before committing, so the new
 * route renders synchronously (no Suspense fallback flash).
 */
export function runCommit(commit: () => void, enabled: boolean): void {
  const doc =
    typeof document !== 'undefined'
      ? (document as unknown as ViewTransitionDocument)
      : undefined;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  if (enabled && doc?.startViewTransition && !prefersReducedMotion) {
    doc.startViewTransition(() => {
      flushSync(commit);
    });
    return;
  }

  commit();
}
