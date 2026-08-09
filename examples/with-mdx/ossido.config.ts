import type { OssidoConfig } from 'ossido/config';
import { ossidoMdx } from 'ossido-mdx/vite';

const config: OssidoConfig = {
  vite: {
    plugins: [ossidoMdx()],
  },
};

export default config;
