import { useCallback } from 'react'

import { useRouterContext } from '../components/RouterContext'

type NavigationType = 'pushState' | 'replaceState'
type NavigationFn = (path: string, opts?: NavigationOptions) => void

interface NavigationOptions {
  /**
   * If "false" the scroll offset will be kept across page navigation. Default "true"
   */
  scroll?: boolean
}

interface UseRouterResult {
  /**
   * Redirects to the path passed as argument updating the browser history.
   */
  push: NavigationFn

  /**
   * Redirects to the path passed as argument replacing the current history
   * entry.
   */
  replace: NavigationFn

  /**
   * This object contains all the query params of the current route
   */
  query: Record<string, string>

  /**
   * Returns the current pathname
   */
  pathname: string
}

export const useRouter = (): UseRouterResult => {
  const { location, updateLocation } = useRouterContext()

  const navigate = useCallback(
    (type: NavigationType, path: string, opts?: NavigationOptions): void => {
      const { scroll = true } = opts || {}
      const url = new URL(path, window.location.origin)

      // The history/scroll update is applied by `updateLocation` when the
      // navigation actually commits — which, for a route without `loading.tsx`,
      // is after its data has been prefetched (so the URL doesn't change while
      // the current page is still showing).
      updateLocation(
        {
          href: url.href,
          pathname: url.pathname,
          search: Object.fromEntries(url.searchParams),
          searchStr: url.search,
          hash: url.hash,
        },
        { history: { type, path }, scroll },
      )
    },
    [updateLocation],
  )

  const push = useCallback(
    (path: string, opts?: NavigationOptions): void => {
      navigate('pushState', path, opts)
    },
    [navigate],
  )

  const replace = useCallback(
    (path: string, opts?: NavigationOptions): void => {
      navigate('replaceState', path, opts)
    },
    [navigate],
  )

  return {
    push,
    replace,
    query: location.search,
    pathname: location.pathname,
  }
}
