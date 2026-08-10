import fs from 'node:fs';
import path from 'node:path';

import mdx from '@mdx-js/rollup';
import type { Plugin } from 'vite';

/**
 * The module the MDX compiler imports `useMDXComponents` from (via
 * `providerImportSource`). It is virtual: the `ossido-mdx:components` plugin
 * resolves it to the project's `src/mdx-components` file, or a passthrough
 * default when that file doesn't exist yet.
 */
const VIRTUAL_ID = 'virtual:ossido-mdx/components';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;

const COMPONENTS_BASENAME = 'mdx-components';
const EXTENSIONS = ['tsx', 'jsx', 'ts', 'js'] as const;

/**
 * Locate the project's `src/mdx-components.{tsx,jsx,ts,js}`.
 *
 * ossido runs vite with `root: '.ossido'`, so the project lives one directory
 * up; we look there first (the real location) and fall back to the vite root so
 * this also works for a non-ossido vite project.
 */
function findComponentsFile(viteRoot: string): string | undefined {
  const projectRoots = [path.dirname(viteRoot), viteRoot];
  for (const base of projectRoots) {
    for (const ext of EXTENSIONS) {
      const candidate = path.join(base, 'src', `${COMPONENTS_BASENAME}.${ext}`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

export interface OssidoMdxOptions {
  /**
   * Extra options forwarded to `@mdx-js/rollup` (remark/rehype plugins, etc.).
   * `providerImportSource` is managed by this plugin and can't be overridden.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mdxOptions?: Record<string, any>;
}

/**
 * MDX support for ossido with a Next.js-style global components convention.
 *
 * Add it to your ossido config's `vite.plugins`:
 *
 * ```ts
 * // ossido.config.ts
 * import { ossidoMdx } from '@ossido-labs/ossido-mdx/vite'
 *
 * export default { vite: { plugins: [ossidoMdx()] } }
 * ```
 *
 * Then style Markdown globally by exporting `useMDXComponents` from
 * `src/mdx-components.tsx` — every `.mdx` file picks it up, no `<MDXProvider>`
 * needed. Until that file exists, MDX renders with plain HTML elements.
 */
export function ossidoMdx(options: OssidoMdxOptions = {}): Array<Plugin> {
  let viteRoot = process.cwd();

  const componentsPlugin: Plugin = {
    name: 'ossido-mdx:components',
    enforce: 'pre',
    configResolved(config): void {
      viteRoot = config.root;
    },
    resolveId(id): string | undefined {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
      return undefined;
    },
    load(id): string | undefined {
      if (id !== RESOLVED_VIRTUAL_ID) return undefined;

      const file = findComponentsFile(viteRoot);
      if (file) {
        // Emit a POSIX-style specifier: module import paths use forward slashes
        // on every platform. Windows backslashes are invalid escapes in a JS
        // string and are not valid Vite/Rollup module ids.
        const specifier = file.replaceAll('\\', '/');
        // Re-export the user's hook; the dependency on `file` also gives HMR.
        return `export { useMDXComponents } from ${JSON.stringify(specifier)}`;
      }
      // Passthrough default: MDX works before a mdx-components file is created.
      return `export function useMDXComponents(components) {\n  return components ?? {}\n}`;
    },
  };

  const mdxPlugin: Plugin = {
    enforce: 'pre',
    ...(mdx({
      ...options.mdxOptions,
      providerImportSource: VIRTUAL_ID,
    }) as Plugin),
  };

  return [componentsPlugin, mdxPlugin];
}
