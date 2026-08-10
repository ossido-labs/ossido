import { execFileSync } from 'node:child_process';
import type { ExecFileSyncOptions } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import fs from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const REGISTRY = 'http://localhost:4873/';

// Publish dependencies before dependents (not strictly required — Verdaccio just
// stores tarballs — but it keeps the log readable).
const PACKAGES = [
  'ossido-ui',
  'ossido-react-vite-plugin',
  'ossido-router',
  'ossido',
  // A devDependency of scaffolded projects (the Fast Refresh lint guardrail), so
  // it must be resolvable from the local registry when testing `ossido new`.
  'ossido-eslint-plugin',
  // A dependency of MDX projects (the `ossido new --mdx` feature), likewise.
  'ossido-mdx',
];

/** Run a command, inheriting stdio and rooting at the repo by default. */
function run(
  cmd: string,
  args: Array<string>,
  opts: ExecFileSyncOptions = {},
): string | Buffer {
  return execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
}

/**
 * The published (scoped) name for a package `folder`, read from its
 * package.json — the folders under `packages/` keep their bare names
 * (`ossido-ui`), but the published packages are scoped (`@ossido-labs/ossido-ui`).
 */
function publishedName(folder: string): string {
  const pkgJson = join(ROOT, 'packages', folder, 'package.json');
  return JSON.parse(fs.readFileSync(pkgJson, 'utf8')).name as string;
}

async function ensureRegistryUp(): Promise<void> {
  try {
    const res = await fetch(`${REGISTRY}-/ping`);
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    console.error(
      `\n✗ Local registry not reachable at ${REGISTRY}\n` +
        `  Start it first:  bun run registry:start\n`,
    );
    process.exit(1);
  }
}

await ensureRegistryUp();

console.log('▸ Building all packages…');
run('bun', ['run', 'build']);

// `bun publish` and `npm unpublish` read the registry + auth token from the
// nearest .npmrc. The repo has none, so drop a temp one at the root (backing up
// any existing file) and restore it afterwards. The token is a throwaway —
// Verdaccio treats an unknown token as anonymous, which `publish: $all` allows.
const npmrcPath = join(ROOT, '.npmrc');
const priorNpmrc = fs.existsSync(npmrcPath) ? fs.readFileSync(npmrcPath) : null;
fs.writeFileSync(
  npmrcPath,
  `registry=${REGISTRY}\n//localhost:4873/:_authToken=ossido-local-registry\n`,
);

try {
  for (const pkg of PACKAGES) {
    const name = publishedName(pkg);
    console.log(`\n▸ ${name}: unpublish (if present) then publish`);
    try {
      // Remove any prior versions so re-publishing the same version succeeds.
      run('npm', ['unpublish', name, '--force'], { stdio: 'ignore' });
    } catch {
      // Not previously published — fine.
    }
    run('bun', ['publish'], { cwd: join(ROOT, 'packages', pkg) });
  }
} finally {
  if (priorNpmrc !== null) fs.writeFileSync(npmrcPath, priorNpmrc);
  else fs.rmSync(npmrcPath, { force: true });
}

console.log(
  `\n✓ Published ${PACKAGES.map(publishedName).join(', ')} to ${REGISTRY}\n\n` +
    `To install them in a test project, add an .npmrc with:\n` +
    `  registry=${REGISTRY}\n` +
    `then run your install (npm install / bun install). Ossido packages come\n` +
    `from the local registry; everything else proxies to npmjs.\n`,
);
