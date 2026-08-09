import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { OssidoConfig } from 'ossido/config';

const config: OssidoConfig = {
  server: { port: 3101 },
  // Animate client-side navigations with the browser View Transitions API.
  viewTransitions: true,
  build: {
    prebuild: (ctx) => {
      console.log(`[prebuild] mode=${ctx.mode} output=${ctx.outputDirectory}`);
    },
    postbuild: (ctx) => {
      console.log(`[postbuild] mode=${ctx.mode} files=${ctx.manifest.length}`);
      // GitHub Pages runs Jekyll, which ignores paths starting with `_` — that
      // would drop the `__ossido/` data dir. A `.nojekyll` marker disables it.
      if (ctx.mode === 'static') {
        writeFileSync(join(ctx.outputDirectory, '.nojekyll'), '');
      }
    },
  },
};

export default config;
