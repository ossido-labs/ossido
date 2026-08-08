import { createContext, useContext } from 'react'

import type { Router } from '../router'
import type { ServerInitialLocation } from '../types'

/** How to reflect a committed navigation in the browser (history + scroll). */
export interface NavigationCommitOptions {
  history?: { type: 'pushState' | 'replaceState'; path: string }
  scroll?: boolean
}

const isServerSide = typeof window === 'undefined'

export interface ParsedLocation {
  href: string
  pathname: string
  search: Record<string, string>
  searchStr: string
  hash: string
}

export interface RouterContextValue {
  router: Router
  location: ParsedLocation
  /**
   * Incremented on every navigation (and on error retry / a manual
   * `refetchProps`). Combined with the
   * pathname it forms the data-resource key, so each navigation gets a fresh
   * resource (a refetch).
   *
   * Initialized to `0` identically on server and client and never changed
   * during the initial mount — otherwise the boundary would remount and flash
   * the loading fallback over server-rendered content (hydration mismatch).
   */
  navigationId: number
  /**
   * Start a navigation to `loc`. Unless the destination has a `loading.tsx`,
   * its data is prefetched first and the navigation is only committed once the
   * data is ready — so the current page stays until then (no blank flash), even
   * across a layout change. `options` carries the browser history/scroll update
   * to apply at commit time.
   */
  updateLocation: (
    loc: ParsedLocation,
    options?: NavigationCommitOptions,
  ) => void
  /**
   * Re-run the current route's data load (a refetch). Used by the error
   * boundary `reset` and by `useRouter().refetchProps`.
   */
  retry: () => void
}

export const RouterContext = createContext({} as RouterContextValue)

export function getInitialLocation(
  serverPayloadLocation: ServerInitialLocation,
): ParsedLocation {
  if (isServerSide) {
    return {
      pathname: serverPayloadLocation.pathname || '',
      hash: '',
      href: serverPayloadLocation.href || '',
      searchStr: serverPayloadLocation.searchStr || '',
      search: Object.fromEntries(
        new URLSearchParams(serverPayloadLocation.searchStr),
      ),
    }
  }

  const { pathname, hash, href, search } = window.location
  return {
    pathname,
    hash,
    href,
    searchStr: search,
    search: Object.fromEntries(new URLSearchParams(search)),
  }
}

/**
 * @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
 */
export function useRouterContext(): RouterContextValue {
  return useContext(RouterContext)
}
