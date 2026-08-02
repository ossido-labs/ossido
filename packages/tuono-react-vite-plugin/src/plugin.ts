import { normalize } from 'node:path'

import type { Plugin, ViteDevServer } from 'vite'

import { routeGenerator } from './fs-routing/generator'
import { getStylesForComponentId, isCssModulesFile } from './styles'

const CRITICAL_CSS_PATH = '/vite-server/tuono_internal__critical_css'

const ROUTES_DIRECTORY_PATH = './src/routes'

let lock = false

interface TuonoReactPluginOptions {
  /**
   * Compute and serve per-route critical CSS in dev (prevents a flash of
   * unstyled content on navigation). Default `true`. Set `false` to skip the
   * (expensive) computation — navigation is faster at the cost of a brief FOUC.
   */
  criticalCss?: boolean
}

export function TuonoReactPlugin(options?: TuonoReactPluginOptions): Plugin {
  const criticalCssEnabled = options?.criticalCss ?? true

  const generate = async (): Promise<void> => {
    if (lock) return
    lock = true

    try {
      await routeGenerator()
    } catch (err) {
      console.error('[tuono] route tree generation failed:', err)
    } finally {
      lock = false
    }
  }

  const handleFile = async (file: string): Promise<void> => {
    const filePath = normalize(file)

    if (filePath.startsWith(ROUTES_DIRECTORY_PATH)) {
      await generate()
    }
  }

  // This manifest is used to store the CSS modules contents in dev mode
  // { [filePath]: cssContent }
  const cssModulesManifest: Record<string, string> = {}

  // Computing a route's critical CSS is expensive (it transforms the module and
  // walks its whole import graph), and it is requested on every navigation — and
  // twice per navigation (the router preloads it, then the `<link rel=stylesheet>`
  // fetches it). Cache the result per `componentId` and drop the whole cache on
  // any hot update, since a component/CSS change can alter any route's graph.
  const criticalCssCache = new Map<string, string | undefined>()

  return {
    name: 'vite-plugin-tuono-react',
    configResolved: async (): Promise<void> => {
      await generate()
    },
    watchChange: async (
      file: string,
      context: { event: string },
    ): Promise<void> => {
      if (['create', 'update', 'delete'].includes(context.event)) {
        await handleFile(file)
      }
    },
    handleHotUpdate: (): void => {
      // A component or stylesheet edit can change any route's critical CSS, so
      // invalidate the whole cache; it repopulates lazily on the next request.
      criticalCssCache.clear()
    },
    transform: (code, id): void => {
      if (isCssModulesFile(id)) {
        cssModulesManifest[id] = code
      }
    },
    configureServer: (server: ViteDevServer): void => {
      // Using middlewares in order to take advantage of async requests out of
      // the box
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      server.middlewares.use(async (req, res, next): Promise<void> => {
        const url = new URL(req.url || '', `http://${req.headers.host || ''}`)

        // Give the request handler access to the critical CSS in dev to avoid a
        // flash of unstyled content since Vite injects CSS file contents via JS
        if (url.pathname === CRITICAL_CSS_PATH) {
          // Disabled via config: skip the expensive graph walk and serve nothing.
          if (!criticalCssEnabled) {
            res.writeHead(200, { 'Content-Type': 'text/css' })
            res.end('')
            return
          }

          const componentId = url.searchParams.get('componentId')
          const cacheKey = componentId ?? ''

          if (!criticalCssCache.has(cacheKey)) {
            criticalCssCache.set(
              cacheKey,
              await getStylesForComponentId(
                server,
                componentId,
                cssModulesManifest,
              ),
            )
          }

          res.writeHead(200, { 'Content-Type': 'text/css' })
          res.end(criticalCssCache.get(cacheKey) ?? '')
          return
        }
        next()
      })
    },
  }
}
