import { normalize } from 'node:path';

import type { Plugin, ViteDevServer } from 'vite';

import { routeGenerator } from './fs-routing/generator';
import { getStylesForComponentId, isCssModulesFile } from './styles';

const CRITICAL_CSS_PATH = '/vite-server/ossido_internal__critical_css';

// Dev-only endpoints `ossido dev` (the CLI) POSTs to around a Rust server
// rebuild; forwarded to the browser as custom HMR events so the client can
// show a "restarting" state and re-fetch route props in place once ready.
const RUST_RESTARTING_PATH = '/__ossido-dev/rust-restarting';
const RUST_READY_PATH = '/__ossido-dev/rust-ready';

const ROUTES_DIRECTORY_PATH = './src/routes';

let lock = false;

interface OssidoReactPluginOptions {
  /**
   * Compute and serve per-route critical CSS in dev (prevents a flash of
   * unstyled content on navigation). Default `true`. Set `false` to skip the
   * (expensive) computation — navigation is faster at the cost of a brief FOUC.
   */
  criticalCss?: boolean;
}

export function OssidoReactPlugin(options?: OssidoReactPluginOptions): Plugin {
  const criticalCssEnabled = options?.criticalCss ?? true;

  // The dev server, once configured — lets route-collection issues surface in
  // the browser's dev error overlay (via a standard Vite error payload, which
  // the patched HMR client forwards to the ossido store) instead of only in
  // the terminal.
  let devServer: ViteDevServer | null = null;
  // Issues already sent to the overlay, so regenerations (every change under
  // `src/routes`) don't re-open it for a known, unchanged issue. An issue that
  // disappears is dropped, so re-breaking the same file reports again.
  const reportedIssues = new Set<string>();

  const generate = async (): Promise<void> => {
    if (lock) return;
    lock = true;

    const seen = new Set<string>();
    try {
      await routeGenerator(undefined, (issue) => {
        const signature = `${issue.file}::${issue.message}`;
        seen.add(signature);
        if (reportedIssues.has(signature)) return;
        reportedIssues.add(signature);
        console.error(`[ossido] ${issue.message}`);
        devServer?.ws.send({
          type: 'error',
          err: {
            message: issue.message,
            stack: '',
            id: issue.file,
            plugin: 'vite-plugin-ossido-react',
          },
        });
      });
      // Forget resolved issues so they re-report if reintroduced.
      for (const signature of reportedIssues) {
        if (!seen.has(signature)) reportedIssues.delete(signature);
      }
    } catch (err) {
      console.error('[ossido] route tree generation failed:', err);
    } finally {
      lock = false;
    }
  };

  const handleFile = async (file: string): Promise<void> => {
    const filePath = normalize(file);

    if (filePath.startsWith(ROUTES_DIRECTORY_PATH)) {
      await generate();
    }
  };

  // This manifest is used to store the CSS modules contents in dev mode
  // { [filePath]: cssContent }
  const cssModulesManifest: Record<string, string> = {};

  // Computing a route's critical CSS is expensive (it transforms the module and
  // walks its whole import graph), and it is requested on every navigation — and
  // twice per navigation (the router preloads it, then the `<link rel=stylesheet>`
  // fetches it). Cache the result per `componentId` and drop the whole cache on
  // any hot update, since a component/CSS change can alter any route's graph.
  const criticalCssCache = new Map<string, string | undefined>();

  return {
    name: 'vite-plugin-ossido-react',
    configResolved: async (): Promise<void> => {
      await generate();
    },
    watchChange: async (
      file: string,
      context: { event: string },
    ): Promise<void> => {
      if (['create', 'update', 'delete'].includes(context.event)) {
        await handleFile(file);
      }
    },
    handleHotUpdate: (): void => {
      // A component or stylesheet edit can change any route's critical CSS, so
      // invalidate the whole cache; it repopulates lazily on the next request.
      criticalCssCache.clear();
    },
    transform: (code, id): void => {
      if (isCssModulesFile(id)) {
        cssModulesManifest[id] = code;
      }
    },
    configureServer: (server: ViteDevServer): void => {
      devServer = server;
      // Using middlewares in order to take advantage of async requests out of
      // the box
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      server.middlewares.use(async (req, res, next): Promise<void> => {
        const url = new URL(req.url || '', `http://${req.headers.host || ''}`);

        // Rust dev-server lifecycle notifications from the CLI, forwarded to
        // the browser as custom HMR events: "restarting" shows a dev-indicator
        // state; "ready" triggers an in-place re-fetch of the current route's
        // server props (so `.rs` edits update the page without a reload).
        if (
          url.pathname === RUST_RESTARTING_PATH ||
          url.pathname === RUST_READY_PATH
        ) {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end();
            return;
          }
          server.ws.send({
            type: 'custom',
            event:
              url.pathname === RUST_READY_PATH
                ? 'ossido:rust-ready'
                : 'ossido:rust-restarting',
          });
          res.statusCode = 204;
          res.end();
          return;
        }

        // Give the request handler access to the critical CSS in dev to avoid a
        // flash of unstyled content since Vite injects CSS file contents via JS
        if (url.pathname === CRITICAL_CSS_PATH) {
          // Disabled via config: skip the expensive graph walk and serve nothing.
          if (!criticalCssEnabled) {
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end('');
            return;
          }

          const componentId = url.searchParams.get('componentId');
          const cacheKey = componentId ?? '';

          if (!criticalCssCache.has(cacheKey)) {
            criticalCssCache.set(
              cacheKey,
              await getStylesForComponentId(
                server,
                componentId,
                cssModulesManifest,
              ),
            );
          }

          res.writeHead(200, { 'Content-Type': 'text/css' });
          res.end(criticalCssCache.get(cacheKey) ?? '');
          return;
        }
        next();
      });
    },
  };
}
