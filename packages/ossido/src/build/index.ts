import { createRequire } from 'node:module'
import { resolve, join } from 'node:path'
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

import type { InlineConfig, Plugin } from 'vite'
import { build, createServer, mergeConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import inject from '@rollup/plugin-inject'
import { OssidoReactPlugin, routeGenerator } from 'ossido-react-vite-plugin'
import { ErrorOverlayVitePlugin } from 'ossido-ui/vite-plugin'

import type { InternalOssidoConfig } from './types'
import { blockingAsync } from './utils'
import { createJsonConfig, loadConfig } from './config'
import { ENV_PREFIX } from './constants'
import { createOssidoViteLogger } from './logger'

const require = createRequire(import.meta.url)

/**
 * Absolute entry paths for the generated `.ossido` scaffold.
 *
 * The vite config sets `root: '.ossido'`. Vite's `build()` resolves a relative
 * `rollupOptions.input` against the CWD, but the dev server's dependency
 * scanner (rolldown, vite 8+) resolves it against `root` — so a path like
 * `./.ossido/client-main.tsx` double-nests to `.ossido/.ossido/...` and fails to
 * resolve. Absolute paths are unambiguous across both code paths.
 */
const CLIENT_MAIN_ENTRY = resolve('.ossido/client-main.tsx')
const SERVER_MAIN_ENTRY = resolve('.ossido/server-main.tsx')

/**
 * `@rollup/plugin-inject` injects these imports into every module that
 * references the globals below — including third-party files deep in
 * `node_modules` (e.g. `react-dom/server`). Vite 8's bundler (rolldown)
 * resolves an injected bare specifier relative to the *importing* file, so
 * `'ossido/ssr'` fails to resolve from within `react-dom`. Resolving to
 * absolute paths up-front makes the injected imports resolvable from anywhere
 * (and is a no-op for rollup on Vite <= 7).
 */
const SSR_POLYFILLS_MODULE = require.resolve('ossido/ssr')
const WEB_STREAMS_POLYFILL_MODULE = require.resolve('web-streams-polyfill')

const VITE_SSR_PLUGINS: Array<Plugin> = [
  {
    enforce: 'post',
    // `@rollup/plugin-inject` is typed against an older rollup than the one
    // bundled with vite, so its `Plugin` type needs widening to vite's.
    ...(inject({
      ReadableStream: [WEB_STREAMS_POLYFILL_MODULE, 'ReadableStream'],

      /**
       * Added to support `react@19`
       * @see https://github.com/tuono-labs/tuono/issues/218
       */
      MessageChannel: [SSR_POLYFILLS_MODULE, 'MessageChannelPolyfill'],
      MessageEvent: [SSR_POLYFILLS_MODULE, 'MessageEventPolyfill'],
      Event: [SSR_POLYFILLS_MODULE, 'EventPolyfill'],
    }) as unknown as Plugin),
  },
]

/**
 * From a resolved {@link InternalOssidoConfig} return a `vite` "mergeable"
 * {@link InlineConfig} including all default ossido related options
 */
function createBaseViteConfigFromOssidoConfig(
  ossidoConfig: InternalOssidoConfig,
): InlineConfig {
  /**
   * @warning Keep in sync with {@link LazyLoadingPlugin} tests:
   * packages/lazy-fn-vite-plugin/tests/transpileSource.test.ts
   */
  const pluginFilesInclude = /\.(jsx|js|mdx|md|tsx|ts)$/

  const viteBaseConfig: InlineConfig = {
    root: '.ossido',
    // `'error'` (not `'silent'`) so build failures surface instead of
    // degrading to a silent client-side fallback with hydration mismatches.
    logLevel: 'error',
    // Tag vite's output `[FE]` so it matches the rest of the Ossido logs. The
    // level is passed explicitly so the logger honours it (see the logger docs)
    // — this keeps vite's info/benign-warning noise out at `'error'`.
    customLogger: createOssidoViteLogger('error'),
    publicDir: '../public',
    cacheDir: 'cache',
    envDir: '../',
    envPrefix: ENV_PREFIX,

    define: {
      // Baked into the client bundle for `ossido build --static` (the CLI sets
      // `OSSIDO_STATIC` for the react build). The router reads it to fetch the
      // pre-rendered `.json` data files instead of the extensionless
      // `/__ossido/data{path}` route, which has no server in a static export.
      __OSSIDO_STATIC__: JSON.stringify(process.env.OSSIDO_STATIC === 'true'),
      // Baked into both bundles so `<CriticalCss>` skips rendering its dev
      // stylesheet links when `dev.criticalCss: false` — the vite endpoint is
      // disabled in that case, so the links would otherwise be dead requests
      // that block rendering.
      __OSSIDO_CRITICAL_CSS__: JSON.stringify(
        ossidoConfig.dev?.criticalCss ?? true,
      ),
    },

    resolve: {
      alias: ossidoConfig.vite?.alias ?? {},
    },

    css: ossidoConfig.vite?.css,

    optimizeDeps: ossidoConfig.vite?.optimizeDeps,

    plugins: [
      ...(ossidoConfig.vite?.plugins ?? []),

      /**
       * even if `include` is not a valid option for this
       * plugin, we have to use it.
       * If not specified, when running `ossido dev`, the mdx
       * won't be compiled include any style in the page and it might
       * seem broken.
       */
      // @ts-expect-error see above comment
      react({ include: pluginFilesInclude }),

      OssidoReactPlugin({ criticalCss: ossidoConfig.dev?.criticalCss ?? true }),
    ],
  }

  // seems redundant but it's useful to log the value when debugging, until we have a logging infrastructure.
  return viteBaseConfig
}

const developmentSSRBundle = (): void => {
  blockingAsync(async () => {
    const config = await loadConfig()
    await build(
      mergeConfig<InlineConfig, InlineConfig>(
        createBaseViteConfigFromOssidoConfig(config),
        {
          plugins: VITE_SSR_PLUGINS,
          build: {
            ssr: true,
            minify: false,
            outDir: 'server',
            emptyOutDir: true,
            rollupOptions: {
              input: SERVER_MAIN_ENTRY,
              output: {
                entryFileNames: 'dev-server.js',
                // ESM (not IIFE) so the SSR entry can use top-level `await`; the
                // Rust runtime compiles it as a V8 module (`Ssr::from_module`).
                // `inlineDynamicImports` keeps it a single file — the runtime
                // reads exactly one `dev-server.js` — since ESM output would
                // otherwise code-split the route `import()`s into chunks.
                format: 'es',
                inlineDynamicImports: true,
              },
            },
          },
          ssr: {
            target: 'webworker',
            noExternal: true,
          },
        },
      ),
    )
  })
}

const developmentCSRWatch = (): void => {
  blockingAsync(async () => {
    const config = await loadConfig()

    const server = await createServer(
      mergeConfig<InlineConfig, InlineConfig>(
        createBaseViteConfigFromOssidoConfig(config),
        {
          // Entry point for the development vite proxy
          base: '/vite-server/',
          plugins: [ErrorOverlayVitePlugin],

          server: {
            host: config.server.host,
            port: config.server.port + 1,
            strictPort: true,
          },
          build: {
            manifest: true,
            emptyOutDir: true,
            rollupOptions: {
              input: CLIENT_MAIN_ENTRY,
            },
          },
        },
      ),
    )
    await server.listen()
  })
}

const KB = 1024

const formatKb = (bytes: number): string => `${(bytes / KB).toFixed(1)} kB`

/**
 * Print a compact per-asset size summary (raw + gzip) for the prod build, so
 * size regressions are visible on every `ossido build` without extra tooling.
 * Reads the emitted files directly — works regardless of vite's log level.
 */
const printBundleSummary = (): void => {
  interface AssetRow {
    label: string
    size: number
    gzip: number
  }

  const collectDir = (dir: string, prefix: string): Array<AssetRow> => {
    try {
      return readdirSync(dir, { recursive: true, encoding: 'utf-8' })
        .filter((file) => /\.(js|css)$/.test(file))
        .map((file) => {
          const content = readFileSync(join(dir, file))
          return {
            label: `${prefix}/${file}`,
            size: content.length,
            gzip: gzipSync(content).length,
          }
        })
    } catch {
      return []
    }
  }

  const assets = [
    ...collectDir(resolve('out/client'), 'client'),
    ...collectDir(resolve('out/server'), 'server'),
  ].sort((a, b) => b.size - a.size)

  if (!assets.length) return

  const labelWidth = Math.max(...assets.map((asset) => asset.label.length))
  console.log('')
  for (const asset of assets) {
    console.log(
      `  ${asset.label.padEnd(labelWidth)}  ${formatKb(asset.size).padStart(10)} │ gzip: ${formatKb(asset.gzip).padStart(9)}`,
    )
  }
  const total = assets.reduce((sum, asset) => sum + asset.size, 0)
  const totalGzip = assets.reduce((sum, asset) => sum + asset.gzip, 0)
  console.log(
    `  ${'total'.padEnd(labelWidth)}  ${formatKb(total).padStart(10)} │ gzip: ${formatKb(totalGzip).padStart(9)}`,
  )
  console.log('')
}

const buildProd = (): void => {
  blockingAsync(async () => {
    const config = await loadConfig()

    // Generate the route tree once up front. Both builds' plugin instances
    // re-run the generator on `configResolved`, but it skips the write when
    // the content is unchanged — pre-generating removes the concurrent-write
    // hazard so the two builds (independent outputs) can run in parallel.
    await routeGenerator()

    await Promise.all([
      build(
        mergeConfig<InlineConfig, InlineConfig>(
          createBaseViteConfigFromOssidoConfig(config),
          {
            build: {
              manifest: true,
              emptyOutDir: true,
              outDir: '../out/client',
              rollupOptions: {
                input: CLIENT_MAIN_ENTRY,
              },
            },
          },
        ),
      ),
      build(
        mergeConfig<InlineConfig, InlineConfig>(
          createBaseViteConfigFromOssidoConfig(config),
          {
            plugins: VITE_SSR_PLUGINS,
            build: {
              ssr: true,
              minify: true,
              outDir: '../out/server',
              emptyOutDir: true,
              rollupOptions: {
                input: SERVER_MAIN_ENTRY,
                output: {
                  entryFileNames: 'prod-server.js',
                  // ESM (not IIFE) so the SSR entry can use top-level `await`;
                  // the Rust runtime compiles it as a V8 module
                  // (`Ssr::from_module`). `inlineDynamicImports` keeps it a
                  // single file — the runtime reads exactly one
                  // `prod-server.js` — since ESM output would otherwise
                  // code-split the route `import()`s into chunks.
                  format: 'es',
                  inlineDynamicImports: true,
                },
              },
            },
            ssr: {
              target: 'webworker',
              noExternal: true,
            },
          },
        ),
      ),
    ])

    printBundleSummary()
  })
}

const buildConfig = (): void => {
  blockingAsync(async (): Promise<void> => {
    await build({
      root: '.ossido',
      // `'error'` (not `'silent'`) so config build failures are visible.
      logLevel: 'error',
      cacheDir: 'cache',
      envDir: '../',
      build: {
        ssr: true,
        outDir: 'config',
        emptyOutDir: true,
        rollupOptions: {
          input: './ossido.config.ts',
          output: {
            entryFileNames: 'config.mjs',
          },
        },
      },
    })

    const config = await loadConfig()
    await createJsonConfig(config)
  })
}

export { buildProd, buildConfig, developmentCSRWatch, developmentSSRBundle }
