import { useState } from 'react'
import type { JSX } from 'react'

import type { ServerInitialLocation, Mode, ServerErrorPayload } from '../types'
import type { Router } from '../router'
import {
  buildResourceKey,
  seedResource,
  seedErrorResource,
  toDataResult,
} from '../data/resourceCache'

import { RouterContextProvider, getInitialLocation } from './RouterContext'
import { Matches } from './Matches'

interface RouterProviderProps {
  router: Router
  serverInitialLocation: ServerInitialLocation
  serverInitialData: unknown
  /** Set when the initial route's Rust handler panicked (dev mode). */
  serverInitialError?: ServerErrorPayload
  mode?: Mode
}

export function RouterProvider({
  router,
  serverInitialLocation,
  serverInitialData,
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
