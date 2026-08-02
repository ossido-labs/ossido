import type { TuonoConfig } from 'tuono/config'

const config: TuonoConfig = {
  vite: {
    alias: {
      '@': 'src',
    },
  },
  ssr: {
    renderThreads: 1,
  }
}

export default config
