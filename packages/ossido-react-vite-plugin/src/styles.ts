/**
 * This module is strongly inspired by the remix project.
 *
 * source: https://github.com/remix-run/remix/blob/main/packages/remix-dev/vite/styles.ts
 */
import path from 'path';

import type { ModuleNode, ViteDevServer } from 'vite';

const isCssFile = (file: string): boolean => cssFileRegExp.test(file);

const cssFileRegExp =
  /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/;

const cssModulesRegExp = new RegExp(`\\.module${cssFileRegExp.source}`);

const routesFolder = path.relative(process.cwd(), 'src/routes');

const injectQuery = (url: string, query: string): string =>
  url.includes('?') ? url.replace('?', `?${query}&`) : `${url}?${query}`;

export const isCssModulesFile = (file: string): boolean =>
  cssModulesRegExp.test(file);

const cssUrlParamsWithoutSideEffects = ['url', 'inline', 'raw', 'inline-css'];

const isCssUrlWithoutSideEffects = (url: string): boolean => {
  const queryString = url.split('?')[1];

  if (!queryString) {
    return false;
  }

  const params = new URLSearchParams(queryString);
  for (const paramWithoutSideEffects of cssUrlParamsWithoutSideEffects) {
    if (
      // Parameter is blank and not explicitly set, i.e. "?url", not "?url="
      params.get(paramWithoutSideEffects) === '' &&
      !url.includes(`?${paramWithoutSideEffects}=`) &&
      !url.includes(`&${paramWithoutSideEffects}=`)
    ) {
      return true;
    }
  }

  return false;
};

const normalizePath = (modulePath: string): string => {
  return modulePath.startsWith('node_modules')
    ? path.join(process.cwd(), modulePath)
    : modulePath;
};

export const getStylesForModule = async (
  viteDevServer: ViteDevServer,
  moduleUrl: string,
  /**
   * All the CSS modules are preloaded and saved in this manifest
   */
  cssModulesManifest: Record<string, string>,
): Promise<string | undefined> => {
  const styles: Record<string, string> = {};
  const deps: Set<ModuleNode> = new Set();

  const moduleFilePath = normalizePath(moduleUrl);
  try {
    let node: ModuleNode | undefined =
      await viteDevServer.moduleGraph.getModuleByUrl(moduleFilePath);

    // If the module is only present in the client module graph, it won't have
    // been found on the first request to the server. Prime it into the graph,
    // then try again.
    //
    // Route ids are extension-less (e.g. `.../routes/page`), and while a normal
    // `import` resolves that against the configured `resolve.extensions`,
    // `transformRequest` does not — so a non-default extension like `.mdx` fails
    // to load. Resolve the real id first (running the full resolver/plugins) so
    // those routes work too.
    if (!node) {
      const resolved = await viteDevServer.pluginContainer
        .resolveId(moduleFilePath)
        .catch(() => null);
      const idToLoad = resolved?.id ?? moduleFilePath;

      await viteDevServer.transformRequest(idToLoad).catch(() => undefined);

      node =
        (await viteDevServer.moduleGraph.getModuleByUrl(idToLoad)) ??
        (await viteDevServer.moduleGraph.getModuleByUrl(moduleFilePath));
    }

    // Critical CSS is best-effort: if the route's module still can't be resolved
    // (e.g. a loader vite can't reach here), skip it silently — the route still
    // loads its styles the normal way, so this is not an error worth surfacing.
    if (!node) {
      return;
    }
    await findNodeDependencies(viteDevServer, node, deps);
  } catch {
    return;
  }

  for (const dep of deps) {
    if (
      dep.file &&
      isCssFile(dep.file) &&
      !isCssUrlWithoutSideEffects(dep.url) // Ignore styles that resolved as URLs, inline or raw. These shouldn't get injected.
    ) {
      try {
        const css = isCssModulesFile(dep.file)
          ? cssModulesManifest[dep.file]
          : ((
              await viteDevServer.ssrLoadModule(
                // We need the ?inline query in Vite v6 when loading CSS in SSR
                // since it does not expose the default export for CSS in a
                // server environment.
                injectQuery(normalizePath(dep.file), 'inline'),
              )
            ).default as string);

        if (css === undefined) {
          throw new Error();
        }

        styles[dep.url] = css;
      } catch {
        // this can happen with dynamically imported modules
        console.warn(
          `[ossido] critical css: could not load ${dep.file} (resolved from ${dep.url})`,
        );
      }
    }
  }

  return (
    Object.entries(styles)
      .map(([fileName, css]) => [
        `\n/* ${fileName
          // Escape comment syntax in file paths
          .replace(/\/\*/g, '/\\*')
          .replace(/\*\//g, '*\\/')} */`,
        css,
      ])
      .flat()
      .join('\n') || undefined
  );
};

/**
 * This function transform the componentId into a file path.
 * File extension is not required for the vite.moduleGraph URL search.
 */
function findFileFromComponentId(id: string): string {
  if (id.endsWith('/')) {
    return id + 'page';
  }

  if (id.includes('__root__')) {
    return id.replaceAll('__root__', 'layout');
  }

  return id;
}

export const getStylesForComponentId = async (
  viteDevServer: ViteDevServer,
  /**
   * The route name (should match ossido-router specs)
   */
  componentId: string | null,
  /**
   * All the CSS modules are preloaded and saved in this manifest
   */
  cssModulesManifest: Record<string, string>,
): Promise<string | undefined> => {
  const relativeFilePath = path.join(
    routesFolder,
    findFileFromComponentId(componentId || ''),
  );

  const fileUrl = path.join(process.cwd(), relativeFilePath);

  return await getStylesForModule(viteDevServer, fileUrl, cssModulesManifest);
};

/**
 * This function is used to find all the dependencies of a module node.
 * The starting node is always a route.
 */
const findNodeDependencies = async (
  vite: ViteDevServer,
  node: ModuleNode,
  deps: Set<ModuleNode>,
): Promise<void> => {
  // On a cold server start only modules the browser has already requested have
  // been transformed. Anything deeper (e.g. a component imported by the route)
  // sits in the graph as a bare placeholder with no import information, so the
  // walk would dead-end before reaching its CSS. Prime it the same way the
  // top-level route is primed. This also runs the plugin `transform` hook for
  // CSS modules, populating `cssModulesManifest` before it is read below.
  if (!node.ssrTransformResult && !node.transformResult) {
    await vite.transformRequest(node.url).catch(() => undefined);
  }
  // since `ssrTransformResult.deps` contains URLs instead of `ModuleNode`s, this process is asynchronous.
  // instead of using `await`, we resolve all branches in parallel.
  const branches: Array<Promise<void>> = [];

  async function addFromNode(innerNode: ModuleNode): Promise<void> {
    if (!deps.has(innerNode)) {
      deps.add(innerNode);
      await findNodeDependencies(vite, innerNode, deps);
    }
  }

  async function addFromUrl(url: string): Promise<void> {
    const innerNode = await vite.moduleGraph.getModuleByUrl(url);

    if (innerNode) {
      await addFromNode(innerNode);
    }
  }

  if (node.ssrTransformResult) {
    if (node.ssrTransformResult.deps) {
      node.ssrTransformResult.deps.forEach((url) =>
        branches.push(addFromUrl(url)),
      );
    }
  } else {
    node.importedModules.forEach((innerNode: ModuleNode) =>
      branches.push(addFromNode(innerNode)),
    );
  }

  await Promise.all(branches);
};
