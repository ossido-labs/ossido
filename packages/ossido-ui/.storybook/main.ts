import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import type { StorybookConfig } from '@storybook/react-vite'
import type { PluginOption } from 'vite'

// A `\0`-prefixed virtual id with the path base64-encoded, so the resolved id
// contains no `.css` for Vite's built-in `vite:css` plugin to claim (its regex
// matches `.css` followed by `?` or end-of-string).
const RAW_CSS_PREFIX = '\0ossido-raw-css:'

/**
 * Import first-party `.css` files as raw text strings — matching the tsdown
 * `raw-css` plugin used for the package build — so `BaseStyles` receives the
 * stylesheet as a string instead of Vite injecting it as a side effect. Scoped
 * to relative, non-`node_modules` imports so it never touches Storybook's own
 * stylesheets.
 */
function rawCss(): PluginOption {
  return {
    name: 'ossido-ui-storybook-raw-css',
    enforce: 'pre',
    resolveId(id, importer) {
      if (
        importer &&
        !importer.includes('node_modules') &&
        id.startsWith('.') &&
        id.endsWith('.css')
      ) {
        const file = resolve(dirname(importer), id)
        return RAW_CSS_PREFIX + Buffer.from(file).toString('base64')
      }
      return null
    },
    load(id) {
      if (id.startsWith(RAW_CSS_PREFIX)) {
        const file = Buffer.from(
          id.slice(RAW_CSS_PREFIX.length),
          'base64',
        ).toString('utf8')
        return `export default ${JSON.stringify(readFileSync(file, 'utf8'))}`
      }
      return null
    },
  }
}

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [],
  viteFinal: async (viteConfig) => {
    const { mergeConfig } = await import('vite')
    return mergeConfig(viteConfig, { plugins: [rawCss()] })
  },
}

export default config
