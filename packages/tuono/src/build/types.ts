import type {
  TuonoConfig,
  TuonoConfigServer,
  TuonoLogFormat,
  TuonoLogLevel,
} from '../config'

/** Fully-resolved logging config (defaults filled) written to `config.json`. */
export interface InternalTuonoConfigLogging {
  format: TuonoLogFormat
  routeTree: boolean
  browser: {
    enabled: boolean
    level: TuonoLogLevel
  }
}

export interface InternalTuonoConfig
  extends Omit<TuonoConfig, 'server' | 'logging'> {
  server: TuonoConfigServer
  logging: InternalTuonoConfigLogging
}
