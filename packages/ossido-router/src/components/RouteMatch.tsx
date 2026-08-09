import type { JSX } from 'react';
import { memo, Suspense, useMemo } from 'react';

import { DefaultLoading, DefaultError, DevErrorReporter } from 'ossido-ui';

import type { Mode } from '../types';
import type { Route } from '../route';
import { buildResourceKey, readLayoutData } from '../data/resourceCache';

import { useRouterContext } from './RouterContext';
import { CriticalCss } from './CriticalCss';
import { RouteDataLoader } from './RouteDataLoader';
import { OssidoErrorBoundary } from './OssidoErrorBoundary';

interface RouteMatchProps {
  route: Route;
  mode?: Mode;
}

/**
 * Renders the matched route: its parent layouts wrap an error boundary +
 * `<Suspense>` boundary around the data-reading leaf. The boundary is keyed by
 * the data-resource key so a navigation (including same-route param changes)
 * remounts it and shows the loading fallback, while the layouts persist.
 */
export const RouteMatch = ({ route, mode }: RouteMatchProps): JSX.Element => {
  const { location, navigationId, retry } = useRouterContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const routes = useMemo(() => loadParentComponents(route), [route.id]);

  const resourceKey = buildResourceKey(navigationId, location);

  const LoadingComponent = route.options.loadingComponent ?? DefaultLoading;
  // In dev the boundary reports the error to the shared store (rendered by the
  // floating DevErrorOverlayHost); production falls back to a detail-free page
  // so source/stack are never leaked to end users.
  const ErrorComponent =
    route.options.errorComponent ??
    (mode === 'Dev' ? DevErrorReporter : DefaultError);

  return (
    <TraverseRootComponents routes={routes} mode={mode}>
      {/* The leaf route's critical CSS must stay OUTSIDE the <Suspense> below:
          React 19 ties a boundary's reveal to any `precedence` stylesheet
          rendered inside it, which would push the streamed initial content into
          an out-of-order late chunk (empty shell paints first — a flash on
          every cold load). Rendered here it still hoists into the shell's
          <head> as render-blocking, but the boundary streams inline. */}
      <CriticalCss routeFilePath={route.filePath} mode={mode} />
      {/* The <Suspense> is not keyed by the resource key, so navigation
          re-renders (rather than remounts) the subtree. With the destination's
          data + code prefetched by `updateLocation`, that lets the new page
          appear in place with no fallback flash. The error boundary resets via
          `resetKey` instead of a key change. */}
      <Suspense fallback={<LoadingComponent />}>
        <OssidoErrorBoundary
          resetKey={resourceKey}
          fallback={ErrorComponent}
          onReset={retry}
        >
          <RouteDataLoader
            route={route}
            resourceKey={resourceKey}
            location={location}
          />
        </OssidoErrorBoundary>
      </Suspense>
    </TraverseRootComponents>
  );
};

interface TraverseRootComponentsProps {
  routes: Array<Route>;
  children?: React.ReactNode;
  index?: number;
  mode?: Mode;
}

/**
 * Renders the layout (`layout`) components that wrap the selected route.
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
      const route = routes[index] as Route;
      const Parent = route.component;

      // Fallback to the route id if the filePath is not defined
      // as is the case for the root route
      const routeFilePath = route.filePath || route.id;

      // A `layout.rs` handler's data is seeded (by SSR or the page's data fetch)
      // and read synchronously here, then spread as the layout's props alongside
      // `children`. Layouts without a data handler receive only `children`.
      const layoutProps =
        route.options.hasHandler && route.options.dataKey
          ? readLayoutData(route.options.dataKey)
          : undefined;

      return (
        <Parent {...layoutProps}>
          <CriticalCss routeFilePath={routeFilePath} mode={mode} />
          <TraverseRootComponents routes={routes} index={index + 1} mode={mode}>
            {children}
          </TraverseRootComponents>
        </Parent>
      );
    }

    return <>{children}</>;
  },
);
TraverseRootComponents.displayName = 'TraverseRootComponents';

const loadParentComponents = (
  route: Route,
  loader: Array<Route> = [],
): Array<Route> => {
  const parentComponent = route.options.getParentRoute?.() as Route;

  loader.push(parentComponent);

  if (!parentComponent.isRoot) {
    return loadParentComponents(parentComponent, loader);
  }

  return loader.reverse();
};
