import { defineConfig } from '@playwright/test';

import {
  ossidoBin,
  setupScript,
  sharedConfig,
  sharedWebServer,
} from './playwright.shared';

export default defineConfig({
  ...sharedConfig,
  testDir: './tests',
  webServer: {
    ...sharedWebServer,
    command: `node ${setupScript} && ${ossidoBin} dev`,
    port: 3000,
  },
  use: {
    baseURL: 'http://localhost:3000',
  },
});
