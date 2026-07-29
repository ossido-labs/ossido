import { useState } from 'react'
import type { JSX } from 'react'

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
    </RouterContextProvider>
  )
}
