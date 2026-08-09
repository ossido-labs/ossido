import type { UserConfig } from 'tsdown';

interface BuildOptions {
  /** Entry file, e.g. `./src/index.ts` */
  entry: string | Array<string>;
  /** Optional build target, e.g. `es2022` */
  target?: UserConfig['target'];
}

/**
 * Shared tsdown build config for the ossido packages.
 *
 * tsdown externalizes `dependencies` and `peerDependencies` by default, so it
 * replaces the previous Vite library build plus the
 * `vite-plugin-externalize-deps` and `rollup-plugin-preserve-directives`
 * plugins. Type declarations are generated separately by `tsc` (each package's
 * `build` script runs `tsc -p tsconfig.build.json` after tsdown), which is the
 * source of truth for `.d.ts` — so `dts` is off here.
 */
export function defineBuildConfig({ entry, target }: BuildOptions): UserConfig {
  return {
    entry,
    format: 'es',
    // Neutral platform for isomorphic (browser + node) library output, and
    // `.js`/`.d.ts` extensions (not `.mjs`) to match the `exports` map.
    platform: 'neutral',
    fixedExtension: false,
    outDir: 'dist/esm',
    // Preserve the source module structure (one output file per input),
    // matching the previous rollup `preserveModules` behaviour that the
    // package `exports` map relies on.
    unbundle: true,
    // `.d.ts` come from `tsc` (see each package's tsconfig.build.json), not
    // tsdown.
    dts: false,
    // Sourcemaps embed `sourcesContent`, so the packages ship maps (for
    // debugging) without shipping `src`.
    sourcemap: true,
    minify: false,
    target,
  };
}
