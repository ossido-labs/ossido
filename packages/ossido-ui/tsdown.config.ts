import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { defineBuildConfig } from 'vite-config';
import type { Plugin } from 'rolldown';

const RAW_CSS_SUFFIX = '?raw-css';

/**
 * Import `.css` files as raw text strings so components can inject them via
 * `<style>` (no CSS bundling step). The virtual id ends in `?raw-css` — not
 * `.css` — so it slips past tsdown's `css-guard` plugin. See src/css.d.ts.
 */
function rawCss(): Plugin {
  return {
    name: 'ossido:raw-css',
    resolveId(id, importer) {
      if (importer && id.startsWith('.') && id.endsWith('.css')) {
        return resolve(dirname(importer), id) + RAW_CSS_SUFFIX;
      }
      return null;
    },
    load(id) {
      if (id.endsWith(RAW_CSS_SUFFIX)) {
        const file = id.slice(0, -RAW_CSS_SUFFIX.length);
        return `export default ${JSON.stringify(readFileSync(file, 'utf8'))}`;
      }
      return null;
    },
  };
}

export default {
  // Two entries: the React design system (index) and the build-time Vite error
  // overlay plugin (vite/error-overlay), exposed as the `ossido-ui/vite-plugin`
  // subpath so build tooling imports it without pulling in the React runtime.
  ...defineBuildConfig({
    entry: ['./src/index.ts', './src/vite/error-overlay.ts'],
  }),
  plugins: [rawCss()],
};
