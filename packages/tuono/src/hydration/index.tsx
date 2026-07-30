import { hydrateRoot } from 'react-dom/client'
import { createRouter } from 'tuono-router'
import type { createRoute } from 'tuono-router'

import { TuonoEntryPoint } from '../shared/TuonoEntryPoint'
import { SERVER_PAYLOAD_VARIABLE_NAME } from '../constants'

import { installBrowserLogForwarding } from './browserLogForwarding'

type RouteTree = ReturnType<typeof createRoute>

export function hydrate(routeTree: RouteTree): void {
  // In development, mirror the browser console into the dev server console.
  if (window[SERVER_PAYLOAD_VARIABLE_NAME]?.mode === 'Dev') {
    installBrowserLogForwarding()
  }

  // Create a new router instance
  const router = createRouter({ routeTree })

  hydrateRoot(document, <TuonoEntryPoint router={router} />)
}
