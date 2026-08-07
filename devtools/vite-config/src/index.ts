import type { UserConfig } from 'tsdown'

interface BuildOptions {
  /** Entry file, e.g. `./src/index.ts` */
  entry: string | Array<string>
  /** Optional build target, e.g. `es2022` */
  target?: UserConfig['target']
}

/**
 * Shared tsdown build config for the ossido packages.
 *
 * tsdown externalizes `dependencies` and `peerDependencies` by default and
 * emits `.d.ts` files natively, so it replaces the previous Vite library build
 * plus the `vite-plugin-externalize-deps`, `unplugin-isolated-decl` and
 * `rollup-plugin-preserve-directives` plugins.
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
    dts: true,
    sourcemap: true,
    minify: false,
    target,
  }
}
