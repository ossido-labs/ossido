import type { JSX, ReactNode } from 'react'
import { useMemo } from 'react'

import type { ServerPayload } from '../types'
import { SERVER_PAYLOAD_VARIABLE_NAME } from '../constants'

import { OssidoContext, type OssidoContextValue } from './ossido-context'

const isServerSide = typeof window === 'undefined'

interface OssidoContextProviderProps {
  serverPayload?: ServerPayload
  rawServerPayload?: string

  children: ReactNode
}

/**
 * @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
 *
 * @see https://github.com/tuono-labs/tuono/issues/410
 */
export function OssidoContextProvider({
  serverPayload,
  rawServerPayload,
  children,
}: OssidoContextProviderProps): JSX.Element {
  const contextValue: OssidoContextValue = useMemo(() => {
    // At least one of these two should be defined
    const _serverPayload = (
      isServerSide ? serverPayload : window[SERVER_PAYLOAD_VARIABLE_NAME]
    ) as ServerPayload

    return {
      // Maybe this logic should be integrated using defaults
      serverPayload: _serverPayload,
      rawServerPayload,
    }
  }, [serverPayload, rawServerPayload])

  return <OssidoContext value={contextValue}>{children}</OssidoContext>
}
