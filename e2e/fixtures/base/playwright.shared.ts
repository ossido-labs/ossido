import * as path from 'path';

const __dirname = import.meta.dirname;

/** Command used to invoke the ossido CLI.
 *
 * Prefer the workspace-linked `@ossido-labs/ossido-cli` launcher at
 * `node_modules/.bin/ossido` — the same entry point end users get. In the
 * monorepo no per-platform package is installed, so the launcher falls back to
 * the local `target/{release,debug}/ossido` build (produced by
 * `e2e-test-setup.js`). `OSSIDO_BINARY_PATH` still overrides everything. */
export const ossidoBin =
  process.env.OSSIDO_BINARY_PATH ??
  path.join(__dirname, '../../../', 'node_modules', '.bin', 'ossido');

/** Shared e2e setup script (linking the workspace packages, etc.). */
export const setupScript = path.join(__dirname, '../..', 'e2e-test-setup.js');

/** Options common to both the dev and the SSG playwright configs. */
export const sharedConfig = {
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
};

/** `webServer` options common to both configs (command/port differ). */
export const sharedWebServer = {
  timeout: 420 * 1000,
  stdout: 'pipe',
  reuseExistingServer: false,
} as const;
