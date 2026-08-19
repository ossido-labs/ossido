import type { JSX } from 'react';

import {
  SERVER_PAYLOAD_VARIABLE_NAME,
  PUBLIC_ENV_VARIABLE_NAME,
} from '../constants';

import { DevResources } from './DevResources';
import { ProdResources } from './ProdResources';
import {
  useOssidoContextRawServerPayload,
  useOssidoContextServerPayload,
} from './ossido-context';

/**
 * The payload is embedded as a JS expression inside a `<script>`, so a string
 * value containing `</script>` (or `<!--`) could otherwise break out of the tag.
 * Escaping `<` to its unicode form neutralises that while remaining valid JSON.
 */
function escapeForScript(json: string): string {
  return json.replace(/</g, '\\u003c');
}

export function OssidoScripts(): JSX.Element {
  const serverPayload = useOssidoContextServerPayload();
  const rawServerPayload = useOssidoContextRawServerPayload();

  // On the server, reuse the exact JSON the Rust runtime already produced —
  // avoiding a second full `JSON.stringify` of the payload inside V8. On the
  // client the raw string isn't available, so fall back to stringifying the
  // parsed payload; that output is discarded during hydration
  // (`suppressHydrationWarning` keeps the server-rendered script, which has
  // already executed and set `window[...]`).
  const payloadJson = rawServerPayload ?? JSON.stringify(serverPayload);

  return (
    <>
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `window['${SERVER_PAYLOAD_VARIABLE_NAME}']=${escapeForScript(payloadJson)}`,
        }}
      />
      {serverPayload.publicEnv !== undefined && (
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `window['${PUBLIC_ENV_VARIABLE_NAME}']=${escapeForScript(
              JSON.stringify(serverPayload.publicEnv),
            )}`,
          }}
        />
      )}
      {serverPayload.mode === 'Dev' && (
        <DevResources devServerConfig={serverPayload.devServerConfig} />
      )}
      {serverPayload.mode === 'Prod' && (
        <ProdResources
          jsBundles={serverPayload.jsBundles}
          cssBundles={serverPayload.cssBundles}
        />
      )}
    </>
  );
}
