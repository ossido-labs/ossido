/**
 * Dev-only bridge that lets non-React code (the dev menu's "Refresh props"
 * button, the `ossido:rust-ready` HMR listener in the generated client entry)
 * re-fetch the current route's server props in place.
 *
 * `RouterContextProvider` registers its `retry` (wrapped in a transition, the
 * same mechanism as `useRouter().refetchProps()`): bumping the navigation id
 * changes the data-resource key, so the current route re-fetches
 * `/__ossido/data{path}` while the page stays mounted.
 */

let current: (() => void) | null = null;

/**
 * Register the active router's refetch. Returns an unregister function; a
 * stale unregister (after a newer registration) is a no-op.
 */
export function registerPropsRefetch(fn: () => void): () => void {
  current = fn;
  return (): void => {
    if (current === fn) current = null;
  };
}

/**
 * Re-fetch the current route's server props in place (no reload, page stays
 * mounted). No-op when no router is mounted.
 */
export function requestPropsRefetch(): void {
  current?.();
}
