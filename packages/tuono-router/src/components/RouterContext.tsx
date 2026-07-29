import {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from 'react'
import type { ReactNode } from 'react'

import type { Router } from '../router'
import type { ServerInitialLocation } from '../types'
import { fromUrlToParsedLocation } from '../utils/from-url-to-parsed-location'

const isServerSide = typeof window === 'undefined'

export interface ParsedLocation {
  href: string
  pathname: string
  search: Record<string, string>
  searchStr: string
  hash: string
}

interface RouterContextValue {
  router: Router
  location: ParsedLocation
  /**
   * Incremented on every navigation (and error retry). Combined with the
   * pathname it forms the data-resource key, so each navigation refetches and
   * remounts the route's Suspense boundary (showing `loading.tsx`).
   *
   * Initialized to `0` identically on server and client and never changed
   * during the initial mount — otherwise the boundary would remount and flash
   * the loading fallback over server-rendered content (hydration mismatch).
   */
  navigationId: number
  /** Update the current location and start a new navigation. */
  updateLocation: (loc: ParsedLocation) => void
  /** Re-run the current route's data load (used by error boundary `reset`). */
  retry: () => void
}

const RouterContext = createContext({} as RouterContextValue)

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

interface RouterContextProviderProps {
  router: Router
  serverInitialLocation: ServerInitialLocation
  children: ReactNode
}

export function RouterContextProvider({
  router,
  serverInitialLocation,
  children,
}: RouterContextProviderProps): ReactNode {
  // Allow the router to update options on the router instance
  router.update({ ...router.options } as Parameters<typeof router.update>[0])

  const [location, setLocation] = useState<ParsedLocation>(() =>
    getInitialLocation(serverInitialLocation),
  )
  const [navigationId, setNavigationId] = useState<number>(0)

  const updateLocation = useCallback((newLocation: ParsedLocation): void => {
    setNavigationId((id) => id + 1)
    setLocation(newLocation)
  }, [])

  const retry = useCallback((): void => {
    setNavigationId((id) => id + 1)
  }, [])

  /**
   * Listen browser navigation events. The browser has already updated the URL,
   * so this only mirrors it into router state (and bumps the navigation id so
   * the route refetches — preserving back/forward data loads).
   */
  useEffect(() => {
    const updateLocationOnPopStateChange = ({
      target,
    }: PopStateEvent): void => {
      const { location: targetLocation } = target as typeof window
      updateLocation(fromUrlToParsedLocation(targetLocation.href))
    }

    window.addEventListener('popstate', updateLocationOnPopStateChange)

    return (): void => {
      window.removeEventListener('popstate', updateLocationOnPopStateChange)
    }
  }, [updateLocation])

  const contextValue: RouterContextValue = useMemo(
    () => ({
      router,
      location,
      navigationId,
      updateLocation,
      retry,
    }),
    [location, router, navigationId, updateLocation, retry],
  )

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  )
}

/**
 * @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
 */
export function useRouterContext(): RouterContextValue {
  return useContext(RouterContext)
}
