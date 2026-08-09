import { lazy, createElement } from 'react';
import type { ReactElement } from 'react';

import type { RouteComponent } from 'ossido-router';

type ImportFn = () => Promise<{ default: RouteComponent }>;

export const RouteLazyLoading = (factory: ImportFn): RouteComponent => {
  let LoadedComponent: RouteComponent | undefined;
  const LazyComponent = lazy<RouteComponent>(factory);

  const loadComponent = (): Promise<void> =>
    factory().then((module) => {
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
  }

  return Component;
};
