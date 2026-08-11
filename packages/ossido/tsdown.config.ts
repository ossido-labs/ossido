import { defineBuildConfig } from 'vite-config';

/**
 * Explicit `es2022` target to avoid transpiling class properties.
 * @see https://github.com/tuono-labs/tuono/pull/607#discussion_r1983979427
 */
export default defineBuildConfig({
  entry: [
    './src/index.ts',
    './src/actions/index.tsx',
    './src/build/index.ts',
    './src/build-client/index.ts',
    './src/client/index.ts',
    './src/config/index.ts',
    './src/ssr/index.ts',
    './src/hydration/index.tsx',
  ],
  target: 'es2022',
});
