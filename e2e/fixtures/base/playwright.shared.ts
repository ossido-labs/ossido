import { createRequire } from 'node:module';
import * as path from 'path';

const __dirname = import.meta.dirname;
const require = createRequire(import.meta.url);

/** Command used to invoke the ossido CLI.
 *
 * Resolve the workspace `@ossido-labs/ossido-cli` launcher via Node module
 * resolution — independent of where bun hoists the `.bin` symlink (which is not
 * reliably at the repo root in CI) — and run it with `node` (so it also does not
 * depend on the shim's executable bit). In the monorepo no per-platform binary
 * package is installed, so the launcher falls back to the local
 * `target/{release,debug}/ossido` build (produced by `e2e-test-setup.js`).
 * `OSSIDO_BINARY_PATH` still overrides everything. */
export const ossidoBin = process.env.OSSIDO_BINARY_PATH
  ? process.env.OSSIDO_BINARY_PATH
  : `node ${require.resolve('@ossido-labs/ossido-cli/bin/ossido.js')}`;

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
