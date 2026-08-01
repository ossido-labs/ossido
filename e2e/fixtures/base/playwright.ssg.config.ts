import * as path from 'path'

import { defineConfig } from '@playwright/test'

const __dirname = import.meta.dirname

const tuonoDir = path.join(__dirname, '../../../', 'target', 'debug', 'tuono')
const setupScript = path.join(__dirname, '../..', 'e2e-test-setup.js')
const staticServer = path.join(__dirname, 'static-server.mjs')

// Exercises `tuono build --static`: the CLI generates `out/static` (its scrape
// server uses port 3000 transiently during the build), then a plain static file
// server serves the export on 3001 — no rewrites, like a real static host. Run
// as a separate config (not concurrently with the dev config, which also uses
// 3000). See the `test:e2e` script.
export default defineConfig({
  testDir: './tests-ssg',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  webServer: {
    command: `node ${setupScript} && ${tuonoDir} build --static && node ${staticServer} out/static 3001`,
    port: 3001,
    timeout: 420 * 1000,
    stdout: 'pipe',
    reuseExistingServer: false,
  },
  use: {
    baseURL: 'http://localhost:3001',
  },
})
