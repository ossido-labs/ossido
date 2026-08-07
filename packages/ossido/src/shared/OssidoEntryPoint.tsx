import { StrictMode } from 'react'
import type { JSX } from 'react'
import type { RouterInstanceType } from 'ossido-router'

import type { ServerPayload } from '../types'

import { OssidoContextProvider } from './OssidoContext'
import { RouterContextProviderWrapper } from './RouterContextProviderWrapper'

interface OssidoEntryPointProps {
  router: RouterInstanceType
  serverPayload?: ServerPayload
  /** The raw payload JSON (server render only) — see {@link OssidoContext}. */
  rawServerPayload?: string
}

export function OssidoEntryPoint({
  router,
  serverPayload,
  rawServerPayload,
}: OssidoEntryPointProps): JSX.Element {
  return (
    <StrictMode>
      <OssidoContextProvider
        serverPayload={serverPayload}
        rawServerPayload={rawServerPayload}
      >
        <RouterContextProviderWrapper router={router} />
      </OssidoContextProvider>
    </StrictMode>
  )
}
