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
import type { Route } from '../route'
import type { ServerInitialLocation } from '../types'
import { fromUrlToParsedLocation } from '../utils/from-url-to-parsed-location'
import { matchRoute } from '../utils/match-route'
import { buildResourceKey, getOrCreateResource } from '../data/resourceCache'

/** How to reflect a committed navigation in the browser (history + scroll). */
export interface NavigationCommitOptions {
  history?: { type: 'pushState' | 'replaceState'; path: string }
  scroll?: boolean
}

const isServerSide = typeof window === 'undefined'

// Kept in sync with `CriticalCss`. Its `<link rel="stylesheet" precedence>` is
// dev-only, so the presence of one also tells us we're in dev.
const CRITICAL_CSS_PATH = '/vite-server/tuono_internal__critical_css'
const CRITICAL_CSS_LINK_SELECTOR = `link[href*="${CRITICAL_CSS_PATH.split('/').pop()}"]`

/**
 * Warm a route's critical CSS before navigating to it, so the
 * `<link rel="stylesheet" precedence>` that renders on arrival doesn't suspend
 * (and flash the loading fallback) while the stylesheet downloads. Resolves once
 * the resource is cached; never rejects.
 */
function preloadCriticalCss(componentId: string): Promise<void> {
  const href = `${CRITICAL_CSS_PATH}?componentId=${componentId}`
  // Already warmed (or warming) for this route — don't stack up <link>s.
  if (document.querySelector(`link[rel="preload"][href="${href}"]`)) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'style'
    link.href = href
    link.onload = (): void => resolve()
    link.onerror = (): void => resolve()
    document.head.appendChild(link)
  })
}

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

  const updateLocation = useCallback(
    (
      newLocation: ParsedLocation,
      options: NavigationCommitOptions = {},
    ): void => {
      const commit = (): void => {
        setNavigationId((id) => id + 1)
        setLocation(newLocation)
        if (options.history) {
          const { type, path } = options.history
          window.history[type](path, '', path)
        }
        if (options.scroll) {
          window.scroll(0, 0)
        }
      }

      const targetRoute = matchRoute(router.routesById, newLocation.pathname)

      // With a `loading.tsx` (or on the server, or an unknown route) commit
      // immediately — its fallback is meant to show right away. Otherwise wait
      // for everything the destination needs to render before committing, so the
      // current page stays until then and the new one appears fully (no blank).
      if (
        !targetRoute ||
        isServerSide ||
        targetRoute.options.loadingComponent
      ) {
        commit()
        return
      }

      const pending: Array<PromiseLike<unknown>> = []

      // 1. The route's server data (the key the destination render will read —
      //    navigationId is bumped by one on commit — so it reads it synchronously).
      if (targetRoute.options.hasHandler) {
        pending.push(
          getOrCreateResource(
            buildResourceKey(navigationId + 1, newLocation),
            targetRoute,
            newLocation,
          ),
        )
      }

      // In dev the route's critical CSS is a `<link rel="stylesheet" precedence>`
      // (see `CriticalCss`), which React suspends on until it loads. Detect dev by
      // the presence of one for the current page.
      const criticalCssEnabled = !!document.querySelector(
        CRITICAL_CSS_LINK_SELECTOR,
      )

      // Everything else the destination needs to render without suspending:
      //  - the code chunk of the matched route and its lazy ancestor layouts
      //    (otherwise it suspends on the lazy `import()` after commit), and
      //  - the critical CSS of each (otherwise React suspends on the stylesheet).
      for (
        let node: Route | undefined = targetRoute;
        node;
        node = node.isRoot ? undefined : node.options.getParentRoute?.()
      ) {
        const preloadComponent = node.component.preload
        if (preloadComponent) pending.push(preloadComponent())

        const componentId = node.filePath || node.id
        if (criticalCssEnabled && componentId) {
          pending.push(preloadCriticalCss(componentId))
        }
      }

      if (pending.length === 0) {
        commit()
        return
      }

      // Commit once everything settles — a rejected resource still navigates so
      // the error boundary can surface it.
      Promise.all(pending).then(commit, commit)
    },
    [router, navigationId],
  )

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
