import type { JSX } from 'react';

import type { OssidoConfigServer } from '../config';

const DEFAULT_SERVER_CONFIG = { host: 'localhost', origin: null, port: 3000 };
const VITE_PROXY_PATH = '/vite-server';

interface DevResourcesProps {
  devServerConfig?: OssidoConfigServer;
}

export const DevResources = ({
  devServerConfig,
}: DevResourcesProps): JSX.Element => {
  const { host, origin, port } = devServerConfig ?? DEFAULT_SERVER_CONFIG;

  const viteBaseUrl =
    origin != null
      ? `${origin}${VITE_PROXY_PATH}`
      : `http://${host}:${port}${VITE_PROXY_PATH}`;

  /**
   * These scripts must execute in order: the react-refresh preamble has to run
   * (and set `__vite_plugin_react_preamble_installed__`) before `client-main`
   * loads any React component, otherwise `@vitejs/plugin-react-swc` throws
   * "can't detect preamble". `type="module"` already defers execution without
   * blocking parsing, so `async` only removes the ordering guarantee and must
   * NOT be used here — it caused an intermittent preamble race.
   */
  return (
    <>
      <script type="module">
        {[
          `import RefreshRuntime from '${viteBaseUrl}/@react-refresh'`,
          'RefreshRuntime.injectIntoGlobalHook(window)',
          'window.$RefreshReg$ = () => {}',
          'window.$RefreshSig$ = () => (type) => type',
          'window.__vite_plugin_react_preamble_installed__ = true',
        ].join('\n')}
      </script>
      <script type="module" src={`${viteBaseUrl}/@vite/client`}></script>
      <script type="module" src={`${viteBaseUrl}/client-main.tsx`}></script>
    </>
  );
};
