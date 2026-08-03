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
   * Print the route tree on `tuono dev` start-up. Default `false` — set to
   * `true` to opt in. (`tuono build` always prints it, regardless of this
   * option.)
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
  dev?: TuonoConfigDev
  ssr?: TuonoConfigSsr
  /**
   * Default build output mode. Default `'server'`.
   * - `'server'`: build the SSR server (`tuono build`).
   * - `'static'`: statically generate the site (equivalent to `tuono build
   *   --static`).
   *
   * The `--static` / `--server` CLI flags override this per invocation.
   */
  output?: TuonoConfigOutput
}

/** Build output mode. */
export type TuonoConfigOutput = 'static' | 'server'

/** Server-side rendering options. */
export interface TuonoConfigSsr {
  /**
   * Number of dedicated V8 render-pool threads. Each holds a warm isolate and
   * renders one request at a time, off the async runtime (which stays free for
   * I/O). Defaults to the machine's available parallelism (CPU cores), resolved
   * at runtime.
   *
   * Lower it to cap memory on constrained hosts (e.g. `1`); raising it past the
   * core count only adds contention for CPU-bound rendering. Overridable at
   * runtime with the `TUONO_SSR_THREADS` environment variable.
   */
  renderThreads?: number
}

/** Development-only tweaks. */
export interface TuonoConfigDev {
  /**
   * Compute and inject per-route critical CSS during dev navigation, preventing
   * a flash of unstyled content (vite injects CSS via JS, which otherwise
   * arrives a beat late). Default `true`.
   *
   * Computing it walks the route's module/CSS graph, which adds latency to
   * navigation. Set `false` for the snappiest dev navigation, accepting a brief
   * unstyled flash on first visit to a route.
   */
  criticalCss?: boolean
}
