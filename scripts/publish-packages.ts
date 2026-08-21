// Publish all `@ossido-labs/*` packages to the public npm registry, in
// dependency order (deps before dependents) so consumers never see a moment
// where a package resolves to a not-yet-published dependency.
//
//   bun run publish:packages            # publish for real
//   bun run publish:packages --dry-run  # pack + validate, upload nothing
//
// Prerequisites:
//   * npm auth for the `@ossido-labs` scope — run `bun login` (or have a
//     ~/.npmrc token). Add `--otp <code>` below if your account enforces 2FA.
//
// Notes:
//   * `bun publish` (not `npm publish`) rewrites each `workspace:*` interlink to
//     the concrete version in the tarball.
//   * `--registry` is passed explicitly to override `bunfig.toml`, which points
//     bun at the local Verdaccio registry for dev. (We deliberately do NOT set
//     `publishConfig.registry`, so `bun run registry:publish` still targets the
//     local registry.)
//   * Each package's `prepack` builds its `dist` (tsdown + tsc) before packing.
//   * scoped packages publish publicly via each package's
//     `publishConfig.access = "public"`.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// Folder names under `packages/`, ordered deps-before-dependents:
//   ossido-router → ossido-ui;  ossido → react-vite-plugin, router, ui.
//
// The CLI packages (`@ossido-labs/ossido-cli`, its `@ossido-labs/cli-*` platform
// binaries, and `create-ossido`) are intentionally NOT listed here: the platform
// packages need cross-compiled binaries, so they are released only through the
// `release.yml` CI matrix. Use `bun run registry:publish` to exercise the CLI
// packages against the local Verdaccio registry.
const PACKAGES = [
  'ossido-ui',
  'ossido-eslint-plugin',
  'ossido-mdx',
  'ossido-react-vite-plugin',
  'ossido-router',
  'ossido',
];

const dryRun = process.argv.includes('--dry-run');

for (const pkg of PACKAGES) {
  console.log(`\n▸ publishing ${pkg}${dryRun ? ' (dry run)' : ''}…`);
  const args = ['publish', '--cwd', `packages/${pkg}`];
  if (dryRun) args.push('--dry-run');
  // Throws (and aborts the whole run) if any package fails to publish.
  execFileSync('bun', args, { cwd: ROOT, stdio: 'inherit' });
}

console.log(
  `\n✓ ${dryRun ? 'Dry-run complete' : 'Published'} ${PACKAGES.length} packages to NPM`,
);
