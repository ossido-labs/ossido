import type {
  RouteComponent,
  LoadingComponent,
  ErrorComponent,
  NotFoundComponent,
} from './types';
import { trimPathLeft, joinPaths } from './utils';

interface RouteOptions {
  id?: string;
  isRoot?: boolean;
  getParentRoute?: () => Route;
  path?: string;
  filePath?: string;
  /**
   * The route's source file path (e.g. `/about/page`, `/blog/layout`), matching
   * the Rust route key. Used to seed/read this route's server data — for pages
   * and, crucially, for `layout.rs` data (keyed by `dataKey` in the payload's
   * `layoutData`).
   */
  dataKey?: string;
  component: RouteComponent;
  hasHandler?: boolean;
  /**
   * Nearest-ancestor `loading.tsx`, resolved at generation time. Rendered as
   * the `<Suspense>` fallback while this route's server data loads on client
   * navigation. Falls back to a framework default when absent.
   */
  loadingComponent?: LoadingComponent;
  /**
   * Nearest-ancestor `error.tsx`, resolved at generation time. Rendered by the
   * route error boundary. Falls back to a framework default when absent.
   */
  errorComponent?: ErrorComponent;
  /**
   * Nearest-ancestor `not-found.tsx`, resolved at generation time. On the root
   * route it is the global not-found UI, rendered when no route matches. Falls
   * back to a framework default when absent.
   */
  notFoundComponent?: NotFoundComponent;
}

export function createRoute(options: RouteOptions): Route {
  return new Route(options);
}

export const ROOT_ROUTE_ID = '__root__';

export class Route {
  options: RouteOptions;

  /**
   * The route id is used to identify the route in the router
   * and is used to match the route with the URL.
   *
   * For now is the `path`
   */
  id?: string;
  isRoot: boolean;
  /**
   * Used for identify the route by matching the URL
   */
  path?: string;
  fullPath!: string;

  /**
   * Utility to identify the route in the file system
   * Used i.e. for finding the criticalCss to load
   *
   * The path does not include the file extension
   */
  filePath?: string;

  children?: Array<Route>;
  parentRoute?: Route;
  originalIndex?: number;
  component: RouteComponent;

  '$$typeof': symbol;

  constructor(options: RouteOptions) {
    this.isRoot =
      options.isRoot ?? typeof options.getParentRoute !== 'function';
    this.options = options;
    this.$$typeof = Symbol.for('react.memo');

    this.component = options.component;
  }

  init = (originalIndex: number): void => {
    this.originalIndex = originalIndex;

    this.parentRoute = this.options.getParentRoute?.();

    // Only the true root (no parent) claims the shared ROOT_ROUTE_ID. A nested
    // or route-group `layout` is also pathless, but it has a parent — it must
    // get its own id (from its filePath) so it doesn't overwrite the root in
    // `routesById`.
    const isRoot = !this.parentRoute && !this.options.path && !this.options.id;

    if (isRoot) {
      this.path = ROOT_ROUTE_ID;
    }

    let path: undefined | string = isRoot ? ROOT_ROUTE_ID : this.options.path;

    // If the path is anything other than an index path, trim it up
    if (path && path !== '/') {
      path = trimPathLeft(path);
    }

    const customId = this.options.id || path || this.options.filePath;

    // Strip the parentId prefix from the first level of children
    let id = isRoot ? ROOT_ROUTE_ID : joinPaths([customId]);

    if (path === ROOT_ROUTE_ID) {
      path = '/';
    }

    if (id !== ROOT_ROUTE_ID) {
      id = joinPaths(['/', id]);
    }

    this.filePath = this.options.filePath;
    this.path = path;
    this.id = id;
    this.fullPath = path || '';
  };

  addChildren(routes: Array<Route>): this {
    this.children = routes;
    return this;
  }

  update = (options: Partial<RouteOptions>): this => {
    Object.assign(this.options, options);
    this.isRoot = options.isRoot || !options.getParentRoute;
    return this;
  };
}

// TODO: not use yet. To be updated in ossido-fs-router-vite-plugin package
export function createRootRoute(options: RouteOptions): Route {
  return new Route({ ...options, isRoot: true });
}
