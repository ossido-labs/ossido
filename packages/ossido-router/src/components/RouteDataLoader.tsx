import { use } from 'react';
import type { JSX } from 'react';

import type { Route } from '../route';
import { getOrCreateResource } from '../data/resourceCache';

import type { ParsedLocation } from './RouterContext';
import { Redirect } from './Redirect';

interface RouteDataLoaderProps {
  route: Route;
  resourceKey: string;
  location: ParsedLocation;
}

/**
 * Reads the route's server data resource via `use()`. On the initial render the
 * resource is pre-seeded (SSR data) so this resolves synchronously; on client
 * navigation it suspends until the fetch settles, showing the `<Suspense>`
 * fallback (`loading.tsx`). A rejected resource is re-thrown by `use()` and
 * caught by the surrounding error boundary (`error.tsx`).
 *
 * The route's critical CSS is intentionally rendered by `RouteMatch` OUTSIDE
 * the `<Suspense>` boundary (see the note there) — a `precedence` stylesheet
 * inside the boundary would defer its streamed reveal.
 */
export function RouteDataLoader({
  route,
  resourceKey,
  location,
}: RouteDataLoaderProps): JSX.Element {
  const result = use(getOrCreateResource(resourceKey, route, location));

  if (result.kind === 'redirect') {
    return <Redirect to={result.destination} />;
  }

  const Component = route.component;

  // Server data is spread directly as the page component's props.
  return <Component {...result.props} />;
}
