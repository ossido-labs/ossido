import type { OssidoConfig } from '@ossido-labs/ossido/config';
import { ossidoMdx } from '@ossido-labs/ossido-mdx/vite';

const config: OssidoConfig = {
  vite: {
    plugins: [ossidoMdx()],
  },
};

export default config;
