import { hydrateRoot } from 'react-dom/client';
import { createRouter, preloadRouteChain } from 'ossido-router';
import type { createRoute } from 'ossido-router';
import { warmDevErrorSource } from 'ossido-ui';

import { OssidoEntryPoint } from '../shared/OssidoEntryPoint';
import { SERVER_PAYLOAD_VARIABLE_NAME } from '../constants';

import { installBrowserLogForwarding } from './browserLogForwarding';

type RouteTree = ReturnType<typeof createRoute>;

export function hydrate(routeTree: RouteTree): void {
  // In development, mirror the browser console into the dev server console and
  // prefetch the error-overlay's source-highlighting libraries up front (not on
  // first error), so a highlighted excerpt is ready the moment one is needed.
  if (window[SERVER_PAYLOAD_VARIABLE_NAME]?.mode === 'Dev') {
    installBrowserLogForwarding();
    warmDevErrorSource();
  }

  // Create a new router instance
  const router = createRouter({ routeTree });

  // Load the matched route's code (page + wrapping layouts) BEFORE hydrating:
  // the server preloads the same chain and renders the page content inline, so
  // the first client render must also resolve it synchronously — hydrating
  // while the `React.lazy` chunk is still loading would mismatch that HTML.
  const initialPathname =
    window[SERVER_PAYLOAD_VARIABLE_NAME]?.location?.pathname ??
    window.location.pathname;
  void preloadRouteChain(router, initialPathname).finally(() => {
    hydrateRoot(document, <OssidoEntryPoint router={router} />);
  });
}
