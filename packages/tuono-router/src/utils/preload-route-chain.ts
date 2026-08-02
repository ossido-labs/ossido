import type { Route } from '../route'
import type { RouterInstanceType } from '../router'

import { matchRoute } from './match-route'

/**
 * Preload the code of the route matching `pathname` and of every layout that
 * wraps it, so a subsequent render commits the components eagerly instead of
 * suspending on their `React.lazy` chunk.
 *
 * Used ahead of the *initial* render on both sides — the server before
 * streaming (a suspending route would push the page content into an
 * out-of-order late chunk, painting an empty shell first) and the client
 * before hydration (so the first client render matches that inline HTML).
 * Client-side navigation has its own preload in `RouterContext`.
 *
 * A failed chunk load resolves anyway: the render then falls back to the lazy
 * component, which surfaces the load error through the route's error boundary.
 */
export async function preloadRouteChain(
  router: RouterInstanceType,
  pathname?: string,
): Promise<void> {
  const matched = matchRoute(router.routesById, pathname)
  if (!matched) return

  const pending: Array<Promise<void>> = []
  for (
    let node: Route | undefined = matched;
    node;
    node = node.isRoot ? undefined : node.options.getParentRoute?.()
  ) {
    const preload = node.component.preload
    if (preload) pending.push(preload().catch(() => undefined))
  }

  await Promise.all(pending)
}
