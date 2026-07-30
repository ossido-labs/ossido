import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import type { InlineConfig, Plugin } from 'vite'
import { build, createServer, mergeConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import inject from '@rollup/plugin-inject'
import { TuonoReactPlugin } from 'tuono-react-vite-plugin'
import { ErrorOverlayVitePlugin } from 'tuono-ui/vite-plugin'

import type { TuonoConfig } from '../config'

import { blockingAsync } from './utils'
import { createJsonConfig, loadConfig } from './config'
import { ENV_PREFIX } from './constants'
import { createTuonoViteLogger } from './logger'

const require = createRequire(import.meta.url)

/**
 * Absolute entry paths for the generated `.tuono` scaffold.
 *
 * The vite config sets `root: '.tuono'`. Vite's `build()` resolves a relative
 * `rollupOptions.input` against the CWD, but the dev server's dependency
 * scanner (rolldown, vite 8+) resolves it against `root` — so a path like
 * `./.tuono/client-main.tsx` double-nests to `.tuono/.tuono/...` and fails to
 * resolve. Absolute paths are unambiguous across both code paths.
 */
const CLIENT_MAIN_ENTRY = resolve('.tuono/client-main.tsx')
const SERVER_MAIN_ENTRY = resolve('.tuono/server-main.tsx')

/**
 * `@rollup/plugin-inject` injects these imports into every module that
 * references the globals below — including third-party files deep in
 * `node_modules` (e.g. `react-dom/server`). Vite 8's bundler (rolldown)
 * resolves an injected bare specifier relative to the *importing* file, so
 * `'tuono/ssr'` fails to resolve from within `react-dom`. Resolving to
 * absolute paths up-front makes the injected imports resolvable from anywhere
 * (and is a no-op for rollup on Vite <= 7).
 */
const SSR_POLYFILLS_MODULE = require.resolve('tuono/ssr')
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
 * From a given {@link TuonoConfig} return a `vite` "mergeable" {@link InlineConfig}
 * including all default tuono related options
 */
function createBaseViteConfigFromTuonoConfig(
  tuonoConfig: TuonoConfig,
): InlineConfig {
  /**
   * @warning Keep in sync with {@link LazyLoadingPlugin} tests:
   * packages/lazy-fn-vite-plugin/tests/transpileSource.test.ts
   */
  const pluginFilesInclude = /\.(jsx|js|mdx|md|tsx|ts)$/

  const viteBaseConfig: InlineConfig = {
    root: '.tuono',
    // `'error'` (not `'silent'`) so build failures surface instead of
    // degrading to a silent client-side fallback with hydration mismatches.
    logLevel: 'error',
    // Tag vite's output `[FE]` so it matches the rest of the Tuono logs. The
    // level is passed explicitly so the logger honours it (see the logger docs)
    // — this keeps vite's info/benign-warning noise out at `'error'`.
    customLogger: createTuonoViteLogger('error'),
    publicDir: '../public',
    cacheDir: 'cache',
    envDir: '../',
    envPrefix: ENV_PREFIX,

    resolve: {
      alias: tuonoConfig.vite?.alias ?? {},
    },

    css: tuonoConfig.vite?.css,

    optimizeDeps: tuonoConfig.vite?.optimizeDeps,

    plugins: [
      ...(tuonoConfig.vite?.plugins ?? []),

      /**
       * even if `include` is not a valid option for this
       * plugin, we have to use it.
       * If not specified, when running `tuono dev`, the mdx
       * won't be compiled include any style in the page and it might
       * seem broken.
       */
      // @ts-expect-error see above comment
      react({ include: pluginFilesInclude }),

      TuonoReactPlugin({ criticalCss: tuonoConfig.dev?.criticalCss ?? true }),
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
        createBaseViteConfigFromTuonoConfig(config),
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
                format: 'iife',
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
        createBaseViteConfigFromTuonoConfig(config),
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

const buildProd = (): void => {
  blockingAsync(async () => {
    const config = await loadConfig()

    await build(
      mergeConfig<InlineConfig, InlineConfig>(
        createBaseViteConfigFromTuonoConfig(config),
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
    )

    await build(
      mergeConfig<InlineConfig, InlineConfig>(
        createBaseViteConfigFromTuonoConfig(config),
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
                format: 'iife',
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

const buildConfig = (): void => {
  blockingAsync(async (): Promise<void> => {
    await build({
      root: '.tuono',
      // `'error'` (not `'silent'`) so config build failures are visible.
      logLevel: 'error',
      cacheDir: 'cache',
      envDir: '../',
      build: {
        ssr: true,
        outDir: 'config',
        emptyOutDir: true,
        rollupOptions: {
          input: './tuono.config.ts',
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
