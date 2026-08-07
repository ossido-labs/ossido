import type { OssidoConfig } from 'ossido/config'
import tailwindcss from '@tailwindcss/vite'

const config: OssidoConfig = {
  vite: {
    plugins: [tailwindcss()],
    // `@tailwindcss/oxide` is a native `.node` addon used by the Tailwind vite
    // plugin. Ossido's dev critical-CSS step SSR-loads the stylesheet, which pulls
    // oxide into the module graph; without this, Vite tries to pre-bundle it on a
    // cold cache and fails ("UNLOADABLE_DEPENDENCY" reading the binary as UTF-8).
    optimizeDeps: {
      exclude: ['@tailwindcss/oxide'],
    },
  },
}

export default config
