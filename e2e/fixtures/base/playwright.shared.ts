import * as path from 'path'

const __dirname = import.meta.dirname

/** Path to the workspace-built tuono CLI binary. */
export const tuonoBin = path.join(
  __dirname,
  '../../../',
  'target',
  'debug',
  'tuono',
)

/** Shared e2e setup script (linking the workspace packages, etc.). */
export const setupScript = path.join(__dirname, '../..', 'e2e-test-setup.js')

/** Options common to both the dev and the SSG playwright configs. */
export const sharedConfig = {
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
}

/** `webServer` options common to both configs (command/port differ). */
export const sharedWebServer = {
  timeout: 420 * 1000,
  stdout: 'pipe',
  reuseExistingServer: false,
} as const
