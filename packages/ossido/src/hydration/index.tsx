import { hydrateRoot } from 'react-dom/client';
import { createRouter, preloadRouteChain } from '@ossido-labs/ossido-router';
import type { createRoute } from '@ossido-labs/ossido-router';
import { warmDevErrorSource } from '@ossido-labs/ossido-ui';

import { OssidoEntryPoint } from '../shared/OssidoEntryPoint';
import { SERVER_PAYLOAD_VARIABLE_NAME } from '../constants';

import { installBrowserLogForwarding } from './browserLogForwarding';
import { reportPendingFullReload } from './devHmr';

// Dev HMR hooks, re-exported for the generated client entry (the only module
// with an `import.meta.hot` context) to forward events into.
export {
  __ossido__internal__devServerRestarting,
  __ossido__internal__devServerReady,
  __ossido__internal__recordFullReload,
} from './devHmr';

type RouteTree = ReturnType<typeof createRoute>;

export function hydrate(routeTree: RouteTree): void {
  // In development, mirror the browser console into the dev server console and
  // prefetch the error-overlay's source-highlighting libraries up front (not on
  // first error), so a highlighted excerpt is ready the moment one is needed.
  if (window[SERVER_PAYLOAD_VARIABLE_NAME]?.mode === 'Dev') {
    installBrowserLogForwarding();
    warmDevErrorSource();
    // If this load was itself a dev full reload, say what caused it.
    reportPendingFullReload();
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
