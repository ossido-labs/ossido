import type { Route } from '../route'

import { useRouterContext } from '../components/RouterContext'
import { matchRoute, sanitizePathname } from '../utils/match-route'

export { sanitizePathname }

/**
 * Returns the route that matches the given pathname.
 *
 * This hook is also implemented on server side to match the bundle
 * file to load at the first rendering.
 *
 * File: crates/ossido/src/payload.rs
 *
 * Optimizations should occur on both
 */
export function useRoute(pathname?: string): Route | undefined {
  const {
    router: { routesById },
  } = useRouterContext()

  return matchRoute(routesById, pathname)
}
