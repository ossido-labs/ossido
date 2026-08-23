import { lazy, createElement } from 'react';
import type { ReactElement } from 'react';

import type { RouteComponent } from '@ossido-labs/ossido-router';

type ImportFn = () => Promise<{ default: RouteComponent }>;

/**
 * Dev-only identity cache, keyed by the route module's import specifier.
 *
 * When a route file is added/removed, the generated route tree module is
 * rewritten and re-evaluated, calling `RouteLazyLoading` afresh for every
 * route. Without the cache each call would create a new wrapper — a new React
 * component identity — remounting every matched route (and losing its state)
 * on any structural change. Reusing the wrapper per specifier keeps unchanged
 * routes' identity stable across route-tree hot swaps, so React reconciles
 * instead of remounting.
 *
 * This module lives in the library bundle (never hot-reloaded itself), so the
 * cache survives tree re-evaluations. Unbounded, but bounded in practice by
 * the number of route files in the project; dev only.
 */
const wrapperCache = new Map<string, RouteComponent>();

export const RouteLazyLoading = (
  factory: ImportFn,
  specifier?: string,
): RouteComponent => {
  if (import.meta.env.DEV && specifier) {
    const cached = wrapperCache.get(specifier);
    if (cached) {
      // Refresh the import fn: a re-generated tree passes a new closure (same
      // module path). Keeps `preload()` pointing at a live factory.
      cached.__setFactory?.(factory);
      return cached;
    }
  }

  // Mutable so a cached wrapper can adopt the newest factory across tree
  // re-evaluations (read lazily by `preload`; `LazyComponent` keeps the first
  // factory, which resolves the same module — React caches it after first
  // resolution anyway).
  let currentFactory = factory;
  let LoadedComponent: RouteComponent | undefined;
  const LazyComponent = lazy<RouteComponent>(() => currentFactory());

  const loadComponent = (): Promise<void> =>
    currentFactory().then((module) => {
      LoadedComponent = module.default;
    });

  const Component = (
    props: React.ComponentProps<RouteComponent>,
  ): ReactElement => createElement(LoadedComponent || LazyComponent, props);

  Component.preload = loadComponent;

  // Dev-only: HMR swaps the resolved component in place when a route-module edit
  // breaks React Fast Refresh (otherwise vite escalates to a full page reload).
  // The generated route tree calls this from its `import.meta.hot.accept`
  // handler; a router re-render then renders the new component. Absent in prod.
  if (import.meta.env.DEV) {
    Component.update = (next: RouteComponent): void => {
      LoadedComponent = next;
    };
    Component.__setFactory = (next: ImportFn): void => {
      currentFactory = next;
    };
    if (specifier) wrapperCache.set(specifier, Component);
  }

  return Component;
};
