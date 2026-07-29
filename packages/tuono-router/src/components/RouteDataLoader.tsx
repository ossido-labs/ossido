import { use } from 'react'
import type { JSX } from 'react'

import type { Mode } from '../types'
import type { Route } from '../route'
import { getOrCreateResource } from '../data/resourceCache'

import type { ParsedLocation } from './RouterContext'
import { CriticalCss } from './CriticalCss'
import { Redirect } from './Redirect'

interface RouteDataLoaderProps {
  route: Route
  resourceKey: string
  location: ParsedLocation
  mode?: Mode
}

/**
 * Reads the route's server data resource via `use()`. On the initial render the
 * resource is pre-seeded (SSR data) so this resolves synchronously; on client
 * navigation it suspends until the fetch settles, showing the `<Suspense>`
 * fallback (`loading.tsx`). A rejected resource is re-thrown by `use()` and
 * caught by the surrounding error boundary (`error.tsx`).
 */
export function RouteDataLoader({
  route,
  resourceKey,
  location,
  mode,
}: RouteDataLoaderProps): JSX.Element {
  const result = use(getOrCreateResource(resourceKey, route, location))

  if (result.kind === 'redirect') {
    return <Redirect to={result.destination} />
  }

  const Component = route.component

  return (
    <>
      <CriticalCss routeFilePath={route.filePath} mode={mode} />
      {/* Server data is spread directly as the page component's props. */}
      <Component {...result.props} />
    </>
  )
}
