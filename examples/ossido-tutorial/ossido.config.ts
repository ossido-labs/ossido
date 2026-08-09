import type { OssidoConfig } from '@ossido-labs/ossido/config';

const config: OssidoConfig = {
  vite: {
    alias: {
      '@': 'src',
    },
  },
  ssr: {
    renderThreads: 1,
  },
};

export default config;
