import { useSyncExternalStore } from 'react';

// Dev-only HMR bridge for route components.
//
// A route module edit that React Fast Refresh CAN apply in place (the module
// only exports components) never reaches here — vite contains it at that
// module's own boundary. But an edit that breaks the boundary (a non-component
// export, or an anonymous default export) makes react-refresh call
// `import.meta.hot.invalidate()`, which would otherwise propagate to the client
// entry and force a full page reload — refetching the route's server data.
//
// Instead, the generated route tree accepts its route-module deps and swaps the
// affected `route.component`s, then bumps this store so the match tree
// re-renders with them. That downgrades a full reload to a route-subtree
// remount. Prod builds never call `notifyRouteHotUpdate` (the generated hot
// block is dead code under `if (import.meta.hot)` and is eliminated), so the
// subscription is inert.
let version = 0;
const listeners = new Set<() => void>();

/** Bump the store and notify subscribers. Dev-only in practice. */
export function notifyRouteHotUpdate(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): number {
  return version;
}

/**
 * Subscribe the calling component to route hot-swaps. Returns a value that
 * changes whenever {@link notifyRouteHotUpdate} fires, forcing a re-render so
 * freshly swapped `route.component`s are picked up. Inert outside dev, where
 * nothing bumps the store.
 */
export function useRouteHotVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
