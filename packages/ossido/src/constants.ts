export const SERVER_PAYLOAD_VARIABLE_NAME = '__OSSIDO_SERVER_PAYLOAD__';

/**
 * Global holding the project's `#[public]` environment variables. Set on the
 * browser by a `<script>` from `OssidoScripts`, and on the server (V8) by the
 * SSR renderer before rendering. Read by `getEnv` (`@ossido-labs/ossido/env`).
 */
export const PUBLIC_ENV_VARIABLE_NAME = '__OSSIDO_PUBLIC_ENV__';
