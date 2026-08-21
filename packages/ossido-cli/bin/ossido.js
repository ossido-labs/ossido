#!/usr/bin/env node
"use strict";

// Launcher for the ossido CLI. The actual binary is a Rust executable shipped in
// a per-platform npm package (an optionalDependency of this one); npm installs
// only the one matching the host's os/cpu/libc. This script locates that binary
// and execs it, forwarding argv and propagating the exit code / signal.
//
// Resolution order:
//   1. OSSIDO_BINARY_PATH env var  — explicit override (e2e, power users).
//   2. The installed per-platform package.
//   3. A local monorepo build (target/{release,debug}/ossido) — so the same
//      `ossido` script works when developing inside the ossido repo, where no
//      per-platform package is installed.

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const WINDOWS = process.platform === "win32";
const BIN = WINDOWS ? "ossido.exe" : "ossido";

// True on musl libc (Alpine, etc). On glibc, the Node report exposes a
// `glibcVersionRuntime`; on musl that field is absent. Best-effort — a wrong
// guess only affects which Linux package we look for, and the fallbacks cover it.
function isMusl() {
  try {
    const report = process.report && process.report.getReport();
    const header = report && report.header;
    return !!header && header.glibcVersionRuntime == null;
  } catch {
    return false;
  }
}

// Map the host to its per-platform package name, or null if unsupported.
function platformPackage() {
  const { platform, arch } = process;
  if (platform === "darwin" && arch === "arm64") return "@ossido-labs/cli-darwin-arm64";
  if (platform === "darwin" && arch === "x64") return "@ossido-labs/cli-darwin-x64";
  if (platform === "win32" && arch === "x64") return "@ossido-labs/cli-win32-x64-msvc";
  if (platform === "linux" && arch === "x64") {
    return isMusl() ? "@ossido-labs/cli-linux-x64-musl" : "@ossido-labs/cli-linux-x64-gnu";
  }
  if (platform === "linux" && arch === "arm64") {
    return isMusl() ? "@ossido-labs/cli-linux-arm64-musl" : "@ossido-labs/cli-linux-arm64-gnu";
  }
  if (platform === "linux" && arch === "arm") return "@ossido-labs/cli-linux-arm-gnueabihf";
  return null;
}

// (1) Explicit override.
function fromEnv() {
  const p = process.env.OSSIDO_BINARY_PATH;
  return p && fs.existsSync(p) ? p : null;
}

// (2) Installed per-platform package: resolve its package.json, then the binary
// sitting in its `bin/` dir.
function fromPlatformPackage() {
  const pkg = platformPackage();
  if (!pkg) return null;
  try {
    const pkgJson = require.resolve(`${pkg}/package.json`);
    const candidate = path.join(path.dirname(pkgJson), "bin", BIN);
    return fs.existsSync(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

// (3) Monorepo dev fallback: walk up for the Cargo workspace root, prefer a
// release build then a debug build.
function fromLocalBuild() {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    if (
      fs.existsSync(path.join(dir, "Cargo.toml")) &&
      fs.existsSync(path.join(dir, "crates"))
    ) {
      for (const profile of ["release", "debug"]) {
        const candidate = path.join(dir, "target", profile, BIN);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function resolveBinary() {
  return fromEnv() || fromPlatformPackage() || fromLocalBuild();
}

const binary = resolveBinary();
if (!binary) {
  const pkg = platformPackage();
  if (pkg) {
    console.error(
      `ossido: no prebuilt binary found for ${process.platform}-${process.arch}.\n` +
        `The optional dependency "${pkg}" is not installed. Reinstall with optional ` +
        `dependencies enabled (e.g. \`npm install --include=optional\`), or build from source.`,
    );
  } else {
    console.error(
      `ossido: unsupported platform ${process.platform}-${process.arch}. ` +
        `See https://ossido.dev for supported targets or build from source.`,
    );
  }
  process.exit(1);
}

const result = spawnSync(binary, process.argv.slice(2), {
  stdio: "inherit",
  windowsHide: true,
});

if (result.error) {
  console.error(`ossido: failed to run ${binary}: ${result.error.message}`);
  process.exit(1);
}
// Re-raise a terminating signal so Ctrl-C etc. behave as if the CLI ran directly.
if (result.signal) {
  process.kill(process.pid, result.signal);
}
process.exit(result.status == null ? 1 : result.status);
