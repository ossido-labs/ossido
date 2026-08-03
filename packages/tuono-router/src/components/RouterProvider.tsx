import { useState } from 'react'
import type { JSX } from 'react'
import { DevErrorOverlayHost } from 'tuono-ui'

import type { ServerInitialLocation, Mode, ServerErrorPayload } from '../types'
import type { Router } from '../router'
import {
  buildResourceKey,
  seedResource,
  seedErrorResource,
  seedLayoutData,
  toDataResult,
} from '../data/resourceCache'

import { RouterContextProvider, getInitialLocation } from './RouterContext'
import { Matches } from './Matches'

interface RouterProviderProps {
  router: Router
  serverInitialLocation: ServerInitialLocation
  serverInitialData: unknown
  /** Wrapping layouts' server data, keyed by each layout's `dataKey`. */
  serverInitialLayoutData?: Record<string, unknown>
  /** Set when the initial route's Rust handler panicked (dev mode). */
  serverInitialError?: ServerErrorPayload
  mode?: Mode
}

export function RouterProvider({
  router,
  serverInitialLocation,
  serverInitialData,
  serverInitialLayoutData,
  serverInitialError,
  mode,
}: RouterProviderProps): JSX.Element {
  // Seed the initial route's data resource synchronously, during render, once,
  // on server AND client (a `useState` lazy initializer — not an effect, which
  // would run too late and make the first render suspend → hydration mismatch).
  // navigationId starts at 0, matching the key RouteMatch builds on first render.
  useState(() => {
    const initialLocation = getInitialLocation(serverInitialLocation)
    const resourceKey = buildResourceKey(0, initialLocation)
    // A handler panic seeds a rejected resource so the boundary/overlay render;
    // otherwise seed the fulfilled server data.
    if (serverInitialError) {
      seedErrorResource(resourceKey, serverInitialError)
    } else {
      seedResource(resourceKey, toDataResult(serverInitialData))
    }
    // Seed the wrapping layouts' data so they render synchronously (SSR + first
    // client render) without a fetch.
    if (serverInitialLayoutData) {
      seedLayoutData(serverInitialLayoutData)
    }
    return null
  })

  return (
    <RouterContextProvider
      router={router}
      serverInitialLocation={serverInitialLocation}
    >
      <Matches mode={mode} />
      {/* Dev-only: the floating overlay host that surfaces every kind of dev
          error (render/SSR panics, uncaught errors, rejections, Vite build
          errors). Renders null until something is reported.

          `import.meta.env.DEV` is a build-time constant (true only in the dev
          bundle), so the prod build eliminates this branch — the overlay host is
          never rendered in prod. The heavy Shiki syntax-highlighter it uses is
          reached lazily (via the dev error reporter), so the prod build
          code-splits it into chunks that a real prod visitor never fetches (the
          runtime `mode` check gates them). The `mode` check is also what keeps
          the overlay working in the dev bundle. */}
      {import.meta.env.DEV && mode === 'Dev' && <DevErrorOverlayHost />}
    </RouterContextProvider>
  )
}
