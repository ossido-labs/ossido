import type { OssidoConfig } from 'ossido/config'
import mdx from '@mdx-js/rollup'

const config: OssidoConfig = {
  vite: {
    optimizeDeps: {
      exclude: ['@mdx-js/react'],
    },
    plugins: [
      { enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react' }) },
    ],
  },
}

export default config
