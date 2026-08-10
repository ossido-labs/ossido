// Set every publishable manifest to a single version. Used by the release
// workflow to stamp all crates + npm packages with the git tag version before
// publishing, so a release never depends on the versions being hand-bumped in
// the commit.
//
//   bun scripts/set-version.ts 1.2.3
//
// What it rewrites:
//   * packages/*/package.json      -> the package's own `version`
//   * crates/*/Cargo.toml          -> `[package] version` + internal path-dep
//                                     version requirements (e.g. the `ossido`
//                                     crate's dep on `ossido_ssr`)
//
// npm workspace interlinks stay `workspace:*` in source — `bun pm pack` rewrites
// them to the concrete version at pack time, reading the version from bun.lock.
// bun.lock therefore has to be refreshed after this bump, BUT a plain
// `bun install` does not refresh workspace package versions after a manifest
// bump — a known bun bug being fixed in
// https://github.com/oven-sh/bun/pull/36285. Until that lands, refresh each
// entry explicitly (as the release workflow does):
//   for pkg in packages/*/; do bun update --lockfile-only "./$pkg"; done
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(version)) {
  console.error(
    `set-version: invalid or missing semver argument: "${version ?? ''}"`,
  );
  process.exit(1);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function eachManifest(dir: string, file: string): Array<string> {
  const base = join(ROOT, dir);
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .map((name) => join(base, name, file))
    .filter((path) => existsSync(path));
}

// --- npm packages: replace the first top-level `"version": "..."` ---
for (const file of eachManifest('packages', 'package.json')) {
  const src = readFileSync(file, 'utf8');
  const out = src.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`);
  if (out !== src) {
    writeFileSync(file, out);
    console.log(`${file.slice(ROOT.length + 1)} -> ${version}`);
  }
}

// --- rust crates: `[package] version` + internal `ossido*` dep requirements ---
for (const file of eachManifest('crates', 'Cargo.toml')) {
  const src = readFileSync(file, 'utf8');
  const out = src
    // `[package]` table version (lazily bounded to before the next `[section]`).
    .replace(/(\[package\][^[]*?\nversion\s*=\s*)"[^"]*"/, `$1"${version}"`)
    // Path-dependency version reqs on sibling crates, e.g.
    //   ossido_ssr = { path = "../ossido_ssr", version = "0.1.1" }
    .replace(
      /(\bossido[a-z0-9_]*\s*=\s*\{[^}]*?version\s*=\s*)"[^"]*"/g,
      `$1"${version}"`,
    );
  if (out !== src) {
    writeFileSync(file, out);
    console.log(`${file.slice(ROOT.length + 1)} -> ${version}`);
  }
}
