import { StrictMode } from 'react'
import type { JSX } from 'react'
import type { RouterInstanceType } from 'tuono-router'

import type { ServerPayload } from '../types'

import { TuonoContextProvider } from './TuonoContext'
import { RouterContextProviderWrapper } from './RouterContextProviderWrapper'

interface TuonoEntryPointProps {
  router: RouterInstanceType
  serverPayload?: ServerPayload
  /** The raw payload JSON (server render only) — see {@link TuonoContext}. */
  rawServerPayload?: string
}

export function TuonoEntryPoint({
  router,
  serverPayload,
  rawServerPayload,
}: TuonoEntryPointProps): JSX.Element {
  return (
    <StrictMode>
      <TuonoContextProvider
        serverPayload={serverPayload}
        rawServerPayload={rawServerPayload}
      >
        <RouterContextProviderWrapper router={router} />
      </TuonoContextProvider>
    </StrictMode>
  )
}
