import { createContext, useContext } from 'react';

import type { ServerPayload } from '../types';

export interface OssidoContextValue {
  serverPayload: ServerPayload;
  /**
   * The exact JSON string the Rust runtime produced for this render, available
   * only on the server. `OssidoScripts` embeds it verbatim instead of
   * re-`JSON.stringify`-ing the parsed payload inside V8. Undefined on the
   * client (which reads the already-parsed object off `window`).
   */
  rawServerPayload?: string;
}

export const OssidoContext = createContext({} as OssidoContextValue);

/**
 * @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
 */
export function useOssidoContextServerPayload(): OssidoContextValue['serverPayload'] {
  return useContext(OssidoContext).serverPayload;
}

/**
 * @warning THIS SHOULD NOT BE EXPOSED TO USERLAND
 *
 * The raw server payload JSON (server render only); undefined on the client.
 */
export function useOssidoContextRawServerPayload(): OssidoContextValue['rawServerPayload'] {
  return useContext(OssidoContext).rawServerPayload;
}
