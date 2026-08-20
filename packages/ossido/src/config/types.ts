import type {
  AliasOptions,
  DepOptimizationOptions,
  PluginOption,
  CSSOptions,
} from 'vite';

export interface OssidoConfigServer {
  host: string;
  origin: string | null;
  port: number;
}

/** Output format for the server logs. */
export type OssidoLogFormat = 'pretty' | 'json';

/** Log severities, lowest to highest. */
export type OssidoLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface OssidoConfigLogging {
  /**
   * Output style for the (Rust) server logs.
   * - `'pretty'` (default): human, coloured, single line.
   * - `'json'`: one JSON object per line, GCP Cloud Logging compatible.
   */
  format?: OssidoLogFormat;
  /**
   * Print the route tree on `ossido dev` start-up. Default `false` — set to
   * `true` to opt in. (`ossido build` always prints it, regardless of this
   * option.)
   */
  routeTree?: boolean;
  /** Forwarding of browser `console.*` to the dev server console (dev only). */
  browser?: {
    /** Whether to forward browser logs at all. Default `true`. */
    enabled?: boolean;
    /** Minimum console level to forward. Default `'info'`. */
    level?: OssidoLogLevel;
  };
}

/**
 * @see http://ossido.dev/documentation/configuration
 */
export interface OssidoConfig {
  server?: Partial<OssidoConfigServer>;
  vite?: {
    alias?: AliasOptions;
    css?: CSSOptions;
    optimizeDeps?: DepOptimizationOptions;
    plugins?: Array<PluginOption>;
  };
  logging?: OssidoConfigLogging;
  dev?: OssidoConfigDev;
  ssr?: OssidoConfigSsr;
  /**
   * Default build output mode. Default `'server'`.
   * - `'server'`: build the SSR server (`ossido build`).
   * - `'static'`: statically generate the site (equivalent to `ossido build
   *   --static`).
   *
   * The `--static` / `--server` CLI flags override this per invocation.
   */
  output?: OssidoConfigOutput;
  /** Build lifecycle hooks (`ossido build`, both output modes; not `dev`). */
  build?: OssidoConfigBuild;
  /**
   * Override which `.env` file(s) are loaded, as a path or array of paths
   * (relative to the project root, loaded in order — a later file overrides an
   * earlier one). When set, this **replaces** the default
   * `.env` / `.env.local` / `.env.[mode]` cascade. Leave unset to keep the
   * default cascade.
   *
   * Only meaningful alongside an `#[ossido::Environment]` struct, which defines
   * the typed schema these variables populate.
   */
  env?: string | Array<string>;
  /**
   * Animate client-side navigations with the browser
   * [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API).
   * Default `false`. When enabled, `push`/`replace`/`<Link>`/back-forward
   * navigations run inside `document.startViewTransition` (a crossfade by
   * default; customise with `view-transition-name` / `::view-transition-*` CSS).
   * No-ops where unsupported or under `prefers-reduced-motion`; override per
   * navigation with `push(path, { viewTransition: false })` or
   * `<Link viewTransition={false}>`.
   */
  viewTransitions?: boolean;
}

/** Build output mode. */
export type OssidoConfigOutput = 'static' | 'server';

/**
 * Everything a build hook is given about the current `ossido build`.
 */
export interface OssidoBuildContext {
  /** The resolved output mode for this build. */
  mode: OssidoConfigOutput;
  /**
   * Absolute path to the deployable output directory: `out/static` for a static
   * build, `out` for a server build. The directory you'd upload/deploy.
   */
  outputDirectory: string;
  /** Absolute path to the project's source `public/` folder. */
  publicDirectory: string;
  /**
   * Emitted file paths, relative to `outputDirectory`. Populated for
   * `postbuild` (after all artifacts exist); empty for `prebuild`.
   */
  manifest: Array<string>;
  /** The resolved Ossido config, so hooks can branch on build settings. */
  config: OssidoConfig;
}

/**
 * A build lifecycle hook. May be async — the build awaits it, and a thrown
 * error fails the build.
 */
export type OssidoBuildHook = (ctx: OssidoBuildContext) => void | Promise<void>;

/** `prebuild` / `postbuild` hooks, defined under `build` in the config. */
export interface OssidoConfigBuild {
  /** Runs before the build starts (its `ctx.manifest` is empty). */
  prebuild?: OssidoBuildHook;
  /** Runs after all build artifacts have been produced. */
  postbuild?: OssidoBuildHook;
}

/** Server-side rendering options. */
export interface OssidoConfigSsr {
  /**
   * Number of dedicated V8 render-pool threads. Each holds a warm isolate and
   * renders one request at a time, off the async runtime (which stays free for
   * I/O). Defaults to the machine's available parallelism (CPU cores), resolved
   * at runtime.
   *
   * Lower it to cap memory on constrained hosts (e.g. `1`); raising it past the
   * core count only adds contention for CPU-bound rendering. Overridable at
   * runtime with the `OSSIDO_SSR_THREADS` environment variable.
   */
  renderThreads?: number;
}

/** Development-only tweaks. */
export interface OssidoConfigDev {
  /**
   * Compute and inject per-route critical CSS during dev navigation, preventing
   * a flash of unstyled content (vite injects CSS via JS, which otherwise
   * arrives a beat late). Default `true`.
   *
   * Computing it walks the route's module/CSS graph, which adds latency to
   * navigation. Set `false` for the snappiest dev navigation, accepting a brief
   * unstyled flash on first visit to a route.
   */
  criticalCss?: boolean;
}
