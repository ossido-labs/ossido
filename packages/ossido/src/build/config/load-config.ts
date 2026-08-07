import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { OssidoConfig } from '../../config'

import type { InternalOssidoConfig } from '../types'

import {
  DOT_OSSIDO_FOLDER_NAME,
  CONFIG_FOLDER_NAME,
  CONFIG_FILE_NAME,
} from '../constants'

import { normalizeConfig } from './normalize-config'

export const loadConfig = async (): Promise<InternalOssidoConfig> => {
  try {
    const configFile = (await import(
      pathToFileURL(
        path.join(
          process.cwd(),
          DOT_OSSIDO_FOLDER_NAME,
          CONFIG_FOLDER_NAME,
          CONFIG_FILE_NAME,
        ),
      ).href
    )) as { default: OssidoConfig }

    return normalizeConfig(configFile.default)
  } catch (err) {
    console.error('Failed to load ossido.config.ts')
    console.error(err)
    return {} as InternalOssidoConfig
  }
}
