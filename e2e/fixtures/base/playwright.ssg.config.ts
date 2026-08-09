import * as path from 'path';

import { defineConfig } from '@playwright/test';

import {
  ossidoBin,
  setupScript,
  sharedConfig,
  sharedWebServer,
} from './playwright.shared';

const staticServer = path.join(import.meta.dirname, 'static-server.mjs');

// Exercises `ossido build --static`: the CLI generates `out/static` (its scrape
// server uses port 3000 transiently during the build), then a plain static file
// server serves the export on 3001 — no rewrites, like a real static host. Run
// as a separate config (not concurrently with the dev config, which also uses
// 3000). See the `test:e2e` script.
export default defineConfig({
  ...sharedConfig,
  testDir: './tests-ssg',
  webServer: {
    ...sharedWebServer,
    command: `node ${setupScript} && ${ossidoBin} build --static && node ${staticServer} out/static 3001`,
    port: 3001,
  },
  use: {
    baseURL: 'http://localhost:3001',
  },
});
