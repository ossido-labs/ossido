import type { JSX } from 'react'
import { memo, Suspense, useMemo } from 'react'

import { DefaultLoading, DefaultError, DevErrorOverlay } from 'tuono-ui'

import type { Mode } from '../types'
import type { Route } from '../route'
import { buildResourceKey } from '../data/resourceCache'

import { useRouterContext } from './RouterContext'
import { CriticalCss } from './CriticalCss'
import { RouteDataLoader } from './RouteDataLoader'
import { TuonoErrorBoundary } from './TuonoErrorBoundary'

interface RouteMatchProps {
  route: Route
  mode?: Mode
}

/**
 * Renders the matched route: its parent layouts wrap an error boundary +
 * `<Suspense>` boundary around the data-reading leaf. The boundary is keyed by
 * the data-resource key so a navigation (including same-route param changes)
 * remounts it and shows the loading fallback, while the layouts persist.
 */
export const RouteMatch = ({ route, mode }: RouteMatchProps): JSX.Element => {
  const { location, navigationId, retry } = useRouterContext()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const routes = useMemo(() => loadParentComponents(route), [route.id])

  const resourceKey = buildResourceKey(navigationId, location)

  const LoadingComponent = route.options.loadingComponent ?? DefaultLoading
  // The dev overlay leaks source/stack, so it is only used in development;
  // production falls back to a detail-free page.
  const ErrorComponent =
    route.options.errorComponent ??
    (mode === 'Dev' ? DevErrorOverlay : DefaultError)

  return (
    <TraverseRootComponents routes={routes} mode={mode}>
      <TuonoErrorBoundary
        key={resourceKey}
        fallback={ErrorComponent}
        onReset={retry}
      >
        <Suspense fallback={<LoadingComponent />}>
          <RouteDataLoader
            route={route}
            resourceKey={resourceKey}
            location={location}
            mode={mode}
          />
        </Suspense>
      </TuonoErrorBoundary>
    </TraverseRootComponents>
  )
}

interface TraverseRootComponentsProps {
  routes: Array<Route>
  children?: React.ReactNode
  index?: number
  mode?: Mode
}

/**
 * Renders the layout (`__layout`) components that wrap the selected route.
 * Layouts receive only `children` now — they live OUTSIDE the keyed Suspense
 * boundary, so they persist across navigation while only the page area shows
 * the loading fallback. Memoized so navigation does not re-render layouts.
 */
const TraverseRootComponents = memo(
  ({
    routes,
    index = 0,
    mode,
    children,
  }: TraverseRootComponentsProps): React.JSX.Element => {
    if (routes.length > index) {
      const route = routes[index] as Route
      const Parent = route.component

      // Fallback to the route id if the filePath is not defined
      // as is the case for the root route
      const routeFilePath = route.filePath || route.id

      return (
        <Parent>
          <CriticalCss routeFilePath={routeFilePath} mode={mode} />
          <TraverseRootComponents routes={routes} index={index + 1} mode={mode}>
            {children}
          </TraverseRootComponents>
        </Parent>
      )
    }

    return <>{children}</>
  },
)
TraverseRootComponents.displayName = 'TraverseRootComponents'

const loadParentComponents = (
  route: Route,
  loader: Array<Route> = [],
): Array<Route> => {
  const parentComponent = route.options.getParentRoute?.() as Route

  loader.push(parentComponent)

  if (!parentComponent.isRoot) {
    return loadParentComponents(parentComponent, loader)
  }

  return loader.reverse()
}
