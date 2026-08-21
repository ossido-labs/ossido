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
 * The published (scoped) name for a package directory (relative to the repo
 * root), read from its package.json — the folders keep bare names
 * (`packages/ossido-ui`), but the published packages are scoped
 * (`@ossido-labs/ossido-ui`).
 */
function publishedName(relDir: string): string {
  const pkgJson = join(ROOT, relDir, 'package.json');
  return JSON.parse(fs.readFileSync(pkgJson, 'utf8')).name as string;
}

/** True on musl libc (see the launcher's identical heuristic). */
function isMusl(): boolean {
  try {
    const report = (
      process as { report?: { getReport(): unknown } }
    ).report?.getReport() as
      | { header?: { glibcVersionRuntime?: string } }
      | undefined;
    return !!report?.header && report.header.glibcVersionRuntime == null;
  } catch {
    return false;
  }
}

/** The `npm/platforms/<key>` package matching the current host. */
function hostPlatformKey(): string {
  const { platform, arch } = process;
  if (platform === 'darwin' && arch === 'arm64') return 'darwin-arm64';
  if (platform === 'darwin' && arch === 'x64') return 'darwin-x64';
  if (platform === 'win32' && arch === 'x64') return 'win32-x64-msvc';
  if (platform === 'linux' && arch === 'x64')
    return isMusl() ? 'linux-x64-musl' : 'linux-x64-gnu';
  if (platform === 'linux' && arch === 'arm64')
    return isMusl() ? 'linux-arm64-musl' : 'linux-arm64-gnu';
  if (platform === 'linux' && arch === 'arm') return 'linux-arm-gnueabihf';
  throw new Error(`Unsupported host platform ${platform}-${arch}`);
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

// Build the host-platform CLI binary and drop it into its per-platform package,
// so `@ossido-labs/ossido-cli` resolves a real binary from the local registry
// (mirrors one target of the CI matrix). Linux uses vendored OpenSSL to match CI.
console.log('▸ Building the host ossido CLI binary…');
const hostKey = hostPlatformKey();
const cargoArgs = ['build', '--release', '-p', 'ossido_cli'];
if (process.platform === 'linux') cargoArgs.push('--features', 'vendored-tls');
run('cargo', cargoArgs);
const exe = process.platform === 'win32' ? 'ossido.exe' : 'ossido';
const hostBinDir = join(ROOT, 'npm', 'platforms', hostKey, 'bin');
fs.mkdirSync(hostBinDir, { recursive: true });
fs.copyFileSync(join(ROOT, 'target', 'release', exe), join(hostBinDir, exe));

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

// Publish the JS packages, then the host CLI platform binary, the CLI
// meta-package, and finally the `create-ossido` scaffolder (deps before dependents).
const dirs = [
  ...PACKAGES.map((pkg) => `packages/${pkg}`),
  `npm/platforms/${hostKey}`,
  'packages/ossido-cli',
  'packages/create-ossido',
];

try {
  for (const dir of dirs) {
    const name = publishedName(dir);
    console.log(`\n▸ ${name}: unpublish (if present) then publish`);
    try {
      // Remove any prior versions so re-publishing the same version succeeds.
      run('npm', ['unpublish', name, '--force'], { stdio: 'ignore' });
    } catch {
      // Not previously published — fine.
    }
    run('bun', ['publish'], { cwd: join(ROOT, dir) });
  }
} finally {
  if (priorNpmrc !== null) fs.writeFileSync(npmrcPath, priorNpmrc);
  else fs.rmSync(npmrcPath, { force: true });
}

console.log(
  `\n✓ Published ${dirs.map(publishedName).join(', ')} to ${REGISTRY}\n\n` +
    `To install them in a test project, add an .npmrc with:\n` +
    `  registry=${REGISTRY}\n` +
    `then run your install (npm install / bun install). Ossido packages come\n` +
    `from the local registry; everything else proxies to npmjs.\n`,
);
