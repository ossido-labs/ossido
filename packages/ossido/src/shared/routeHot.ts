import { notifyRouteHotUpdate } from 'ossido-router';

/**
 * Dev-only. Runs the generated route tree's component reassignments (swapping
 * the route components affected by an HMR update), then bumps the router hot
 * store so the match tree re-renders with them.
 *
 * Called from the `import.meta.hot.accept(...)` block the route generator emits.
 * That block is guarded by `if (import.meta.hot)`, so prod builds dead-code
 * eliminate it and tree-shake this helper away.
 */
export function __ossido__internal__applyRouteHot(apply: () => void): void {
  apply();
  notifyRouteHotUpdate();
}
