import type {
  TuonoConfig,
  TuonoConfigServer,
  TuonoConfigOutput,
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

/**
 * Fully-resolved SSR config. `renderThreads` is `null` when unset — the Rust
 * runtime then defaults it to the machine's available parallelism.
 */
export interface InternalTuonoConfigSsr {
  renderThreads: number | null
}

export interface InternalTuonoConfig extends Omit<
  TuonoConfig,
  'server' | 'logging' | 'dev' | 'ssr' | 'output'
> {
  server: TuonoConfigServer
  logging: InternalTuonoConfigLogging
  dev: InternalTuonoConfigDev
  ssr: InternalTuonoConfigSsr
  output: TuonoConfigOutput
}
