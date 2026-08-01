import type { JSX, ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'

import type { ServerPayload } from '../types'
import { SERVER_PAYLOAD_VARIABLE_NAME } from '../constants'

const isServerSide = typeof window === 'undefined'

interface TuonoContextValue {
  serverPayload: ServerPayload
  /**
   * The exact JSON string the Rust runtime produced for this render, available
   * only on the server. `TuonoScripts` embeds it verbatim instead of
   * re-`JSON.stringify`-ing the parsed payload inside V8. Undefined on the
   * client (which reads the already-parsed object off `window`).
   */
  rawServerPayload?: string
}

const TuonoContext = createContext({} as TuonoContextValue)

interface TuonoContextProviderProps {
  serverPayload?: ServerPayload
  rawServerPayload?: string

  children: ReactNode
}

/**
 * @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
 *
 * @see https://github.com/tuono-labs/tuono/issues/410
 */
export function TuonoContextProvider({
  serverPayload,
  rawServerPayload,
  children,
}: TuonoContextProviderProps): JSX.Element {
  const contextValue: TuonoContextValue = useMemo(() => {
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

  return <TuonoContext value={contextValue}>{children}</TuonoContext>
}

/**
 * @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
 */
export function useTuonoContextServerPayload(): TuonoContextValue['serverPayload'] {
  return useContext(TuonoContext).serverPayload
}

/**
 * @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
 *
 * The raw server payload JSON (server render only); undefined on the client.
 */
export function useTuonoContextRawServerPayload(): TuonoContextValue['rawServerPayload'] {
  return useContext(TuonoContext).rawServerPayload
}
