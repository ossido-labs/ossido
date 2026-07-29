import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { defineBuildConfig } from 'vite-config'
import type { Plugin } from 'rolldown'

const RAW_CSS_SUFFIX = '?raw-css'

/**
 * Import `.css` files as raw text strings so the default screens can inject
 * them via `<style>` (the library ships no CSS bundling step). The virtual id
 * ends in `?raw-css` — not `.css` — so it slips past tsdown's `css-guard`
 * plugin, which would otherwise demand `@tsdown/css`. See src/css.d.ts.
 */
function rawCss(): Plugin {
  return {
    name: 'tuono:raw-css',
    resolveId(id, importer) {
      if (importer && id.startsWith('.') && id.endsWith('.css')) {
        return resolve(dirname(importer), id) + RAW_CSS_SUFFIX
      }
      return null
    },
    load(id) {
      if (id.endsWith(RAW_CSS_SUFFIX)) {
        const file = id.slice(0, -RAW_CSS_SUFFIX.length)
        return `export default ${JSON.stringify(readFileSync(file, 'utf8'))}`
      }
      return null
    },
  }
}

export default {
  ...defineBuildConfig({
    entry: './src/index.ts',
  }),
  plugins: [rawCss()],
}
