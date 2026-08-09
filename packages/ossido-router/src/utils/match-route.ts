import type { Route } from '../route';

const DYNAMIC_PATH_REGEX = /\[(.*?)\]/;

interface DynamicRouteEntry {
  route: string;
  segments: Array<string>;
}

/**
 * The dynamic routes of a route table, pre-filtered and pre-split, computed
 * once per `routesById` object instead of on every match. Keyed weakly so the
 * per-request SSR routers are garbage-collected with their cache entry. Sorted
 * by route id so matching order is deterministic and mirrors the server-side
 * matcher (crates/ossido/src/manifest.rs).
 *
 * The route table is only rebuilt when the router receives a new route tree
 * (never after startup in practice), so keying by object identity is safe.
 */
const dynamicRoutesCache = new WeakMap<
  Record<string, Route>,
  Array<DynamicRouteEntry>
>();

function getDynamicRoutes(
  routesById: Record<string, Route>,
): Array<DynamicRouteEntry> {
  let cached = dynamicRoutesCache.get(routesById);
  if (!cached) {
    cached = Object.keys(routesById)
      .filter((route) => DYNAMIC_PATH_REGEX.test(route))
      .sort()
      .map((route) => ({ route, segments: route.split('/').filter(Boolean) }));
    dynamicRoutesCache.set(routesById, cached);
  }
  return cached;
}

/**
 * In order to correctly handle pathnames that might finish with a slash
 * we first sanitize them by removing the final slash.
 */
export function sanitizePathname(pathname: string): string {
  if (pathname.endsWith('/') && pathname !== '/') {
    return pathname.substring(0, pathname.length - 1);
  }

  return pathname;
}

/**
 * Returns the route that matches the given pathname, from the router's route
 * table. Pure (no hooks) so it can be used both by `useRoute` and at navigation
 * time (to inspect the target route before committing).
 *
 * This matching is also implemented on the server side to pick the bundle to
 * load at the first rendering — see crates/ossido/src/payload.rs. Any
 * optimization should happen on both.
 */
export function matchRoute(
  routesById: Record<string, Route>,
  pathname?: string,
): Route | undefined {
  if (!pathname) return;

  pathname = sanitizePathname(pathname);

  if (routesById[pathname]) return routesById[pathname];

  const dynamicRoutes = getDynamicRoutes(routesById);

  if (!dynamicRoutes.length) return;

  const pathSegments = pathname.split('/').filter(Boolean);

  let match = undefined;

  for (const { segments: dynamicRouteSegments } of dynamicRoutes) {
    const routeSegmentsCollector: Array<string> = [];

    for (let i = 0; i < dynamicRouteSegments.length; i++) {
      if (dynamicRouteSegments[i]?.startsWith('[...')) {
        routeSegmentsCollector.push(dynamicRouteSegments[i] ?? '');
        match = `/${routeSegmentsCollector.join('/')}`;
        break;
      }
      if (
        dynamicRouteSegments[i] === pathSegments[i] ||
        DYNAMIC_PATH_REGEX.test(dynamicRouteSegments[i] || '')
      ) {
        routeSegmentsCollector.push(dynamicRouteSegments[i] ?? '');
      } else {
        break;
      }
    }

    if (routeSegmentsCollector.length === pathSegments.length) {
      match = `/${routeSegmentsCollector.join('/')}`;
      break;
    }
  }

  if (!match) return;
  return routesById[match];
}
