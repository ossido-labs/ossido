import type {
  AliasOptions,
  DepOptimizationOptions,
  PluginOption,
  CSSOptions,
} from 'vite'

export interface TuonoConfigServer {
  host: string
  origin: string | null
  port: number
}

/** Output format for the server logs. */
export type TuonoLogFormat = 'pretty' | 'json'

/** Log severities, lowest to highest. */
export type TuonoLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'

export interface TuonoConfigLogging {
  /**
   * Output style for the (Rust) server logs.
   * - `'pretty'` (default): human, coloured, single line.
   * - `'json'`: one JSON object per line, GCP Cloud Logging compatible.
   */
  format?: TuonoLogFormat
  /**
   * Print the route tree on `tuono dev` start-up. Default `true`.
   * (`tuono build` always prints it, regardless of this option.)
   */
  routeTree?: boolean
  /** Forwarding of browser `console.*` to the dev server console (dev only). */
  browser?: {
    /** Whether to forward browser logs at all. Default `true`. */
    enabled?: boolean
    /** Minimum console level to forward. Default `'info'`. */
    level?: TuonoLogLevel
  }
}

/**
 * @see http://tuono.dev/documentation/configuration
 */
export interface TuonoConfig {
  server?: Partial<TuonoConfigServer>
  vite?: {
    alias?: AliasOptions
    css?: CSSOptions
    optimizeDeps?: DepOptimizationOptions
    plugins?: Array<PluginOption>
  }
  logging?: TuonoConfigLogging
}
