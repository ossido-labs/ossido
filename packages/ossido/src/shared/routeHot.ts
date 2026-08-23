import { notifyRouteHotUpdate } from '@ossido-labs/ossido-router';
import type { RouterInstanceType } from '@ossido-labs/ossido-router';

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

/**
 * Dev-only. Swap a re-generated route tree into the live router — the
 * structural counterpart to {@link __ossido__internal__applyRouteHot}.
 *
 * Called from the generated tree's **self**-accept handler when a route file is
 * added/removed/renamed (the tree module is rewritten and re-evaluated; the
 * handler receives the new module and passes its `routeTree` here). The router
 * rebuilds its lookup tables from the new tree, and the hot-store bump makes
 * `Matches` re-match the current URL against them:
 *
 * - unchanged routes keep their component identity (the lazy wrappers are
 *   identity-cached by import specifier), so React reconciles without
 *   remounting — page state survives;
 * - a route that vanished renders the existing not-found UI in place;
 * - the current data-resource key is untouched, so no spurious refetch.
 *
 * A freshly-added `page.rs` handler may lag the tree swap (cargo rebuild):
 * navigating there too early fails the data fetch into the error boundary,
 * which self-heals when the `ossido:rust-ready` refetch bumps the navigation
 * id.
 */
export function __ossido__internal__applyRouteTree(
  newTree: Parameters<RouterInstanceType['update']>[0]['routeTree'],
): void {
  // Self-contained access: the `Window` augmentation lives in ossido-router's
  // own ambient declarations and is not re-exported to dependents.
  const router = (window as { __OSSIDO__ROUTER__?: RouterInstanceType })
    .__OSSIDO__ROUTER__;
  if (!router) return;
  router.update({ routeTree: newTree });
  notifyRouteHotUpdate();
}
