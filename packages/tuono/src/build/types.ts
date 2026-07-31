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

/** Fully-resolved dev config (defaults filled). */
export interface InternalTuonoConfigDev {
  criticalCss: boolean
}

export interface InternalTuonoConfig extends Omit<
  TuonoConfig,
  'server' | 'logging' | 'dev'
> {
  server: TuonoConfigServer
  logging: InternalTuonoConfigLogging
  dev: InternalTuonoConfigDev
}
