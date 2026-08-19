import path from 'node:path';

import type { AliasOptions } from 'vite';

import type { OssidoConfig } from '../../config';

import type { InternalOssidoConfig } from '../types';

import { DOT_OSSIDO_FOLDER_NAME, CONFIG_FOLDER_NAME } from '../constants';

/**
 *  Normalize vite alias option:
 * - If the path starts with `src` folder, transform it to absolute, prepending the ossido root folder
 * - If the path is absolute, remove the ".ossido/config/" path from it
 * - Otherwise leave the path untouched
 */
const normalizeAliasPath = (aliasPath: string): string => {
  if (aliasPath.startsWith('./src') || aliasPath.startsWith('src')) {
    return path.join(process.cwd(), aliasPath);
  }

  if (path.isAbsolute(aliasPath)) {
    return aliasPath.replace(
      path.join(DOT_OSSIDO_FOLDER_NAME, CONFIG_FOLDER_NAME),
      '',
    );
  }

  return aliasPath;
};

/**
 * From a given vite aliasOptions apply {@link normalizeAliasPath} for each alias.
 *
 * The config is bundled by `vite` and emitted inside {@link DOT_OSSIDO_FOLDER_NAME}/{@link CONFIG_FOLDER_NAME}.
 * According to this, we have to ensure that the aliases provided by the user are updated to refer to the right folders.
 *
 * @see https://github.com/Valerioageno/tuono/pull/153#issuecomment-2508142877
 */
const normalizeViteAlias = (alias?: AliasOptions): AliasOptions | undefined => {
  if (!alias) return;

  if (Array.isArray(alias)) {
    return (alias as Extract<AliasOptions, ReadonlyArray<unknown>>).map(
      ({ replacement, ...userAliasDefinition }) => ({
        ...userAliasDefinition,
        replacement: normalizeAliasPath(replacement),
      }),
    );
  }

  if (typeof alias === 'object') {
    const normalizedAlias: AliasOptions = {};
    for (const [key, value] of Object.entries(alias)) {
      normalizedAlias[key] = normalizeAliasPath(value as string);
    }
    return normalizedAlias;
  }

  return alias;
};

/**
 * Wrapper function to normalize the ossido.config.ts file
 *
 * @warning Exported for unit test.
 *          There is no easy way to mock the module export and change it in every test
 *          and also testing the error
 */
export const normalizeConfig = (config: OssidoConfig): InternalOssidoConfig => {
  return {
    server: {
      host: config.server?.host ?? 'localhost',
      origin: config.server?.origin ?? null,
      port: config.server?.port ?? 3000,
    },
    vite: {
      alias: normalizeViteAlias(config.vite?.alias),
      css: config.vite?.css,
      optimizeDeps: config.vite?.optimizeDeps,
      plugins: config.vite?.plugins ?? [],
    },
    logging: {
      format: config.logging?.format ?? 'pretty',
      routeTree: config.logging?.routeTree ?? false,
      browser: {
        enabled: config.logging?.browser?.enabled ?? true,
        level: config.logging?.browser?.level ?? 'info',
      },
    },
    dev: {
      criticalCss: config.dev?.criticalCss ?? true,
    },
    ssr: {
      // `null` = auto: the Rust runtime uses the machine's available
      // parallelism (resolving it here would bake in the build machine's cores).
      renderThreads: config.ssr?.renderThreads ?? null,
    },
    output: config.output ?? 'server',
    viewTransitions: config.viewTransitions ?? false,
    // Coerce a single path to a one-element array so the Rust side always sees
    // `Option<Vec<String>>`. Absent stays absent (default cascade).
    ...(config.env !== undefined
      ? { env: Array.isArray(config.env) ? config.env : [config.env] }
      : {}),
    // Carried through as-is (its `prebuild`/`postbuild` are functions, so they
    // are only reachable via `loadConfig`, never the JSON config). Spread
    // conditionally so an absent `build` isn't materialised as `undefined`.
    ...(config.build ? { build: config.build } : {}),
  };
};
