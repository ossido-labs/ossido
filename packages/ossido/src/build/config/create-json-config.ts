import fs from 'fs/promises'
import path from 'path'

import type { InternalOssidoConfig } from '../types'

import {
  DOT_OSSIDO_FOLDER_NAME,
  CONFIG_FOLDER_NAME,
  SERVER_CONFIG_NAME,
} from '../constants'

const CONFIG_PATH = path.join(
  DOT_OSSIDO_FOLDER_NAME,
  CONFIG_FOLDER_NAME,
  SERVER_CONFIG_NAME,
)
/**
 * Strip the build-time-only, non-serializable properties before the config is
 * written to JSON for the Rust server/client: `vite` (plugins are functions) and
 * `build` (the `prebuild`/`postbuild` hooks are functions). Both would otherwise
 * fail `structuredClone`, and neither is needed by the server/client — the hooks
 * are invoked from the JS build via `loadConfig` (which reads the transpiled
 * config, keeping the functions).
 */
function removeNonSerializableProperties(
  config: InternalOssidoConfig,
): Omit<InternalOssidoConfig, 'vite' | 'build'> {
  /**
   * Using {@link structuredClone} cause the following errors based on runtime env:
   * ```text
   * node
   * DOMException [DataCloneError]: configureServer(s){a.push(s)} could not be cloned.
   *
   * vitest
   * DataCloneError: (id) => id === runtimePublicPath ? id : void 0 could not be cloned.
   * ```
   * when vite plugins are passed inside to the config.
   *
   * Since the purpose of this function is to remove the vite object
   * we are going to use destructing rather than {@link structuredClone} and `delete`
   *
   * @see https://github.com/tuono-labs/tuono/issues/414
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { vite, build, ...configRest } = config
  return structuredClone(configRest)
}

/**
 * This function creates a JSON config file for the server,
 * that will be shared with the client as a prop.
 * The file will be saved at`.ossido/config/config.json`.
 *
 * The file is in JSON format to ensure it's easily read by the server,
 * which is written in Rust.
 */
export async function createJsonConfig(
  config: InternalOssidoConfig,
): Promise<void> {
  const jsonConfig = removeNonSerializableProperties(config)

  const fullPath = path.resolve(CONFIG_PATH)
  const jsonContent = JSON.stringify(jsonConfig)

  // No need to manage error state. Ossido CLI will manage it.
  await fs.writeFile(fullPath, jsonContent, 'utf-8')
}
