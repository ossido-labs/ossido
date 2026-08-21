#!/usr/bin/env node
"use strict";

// `npm create ossido@latest [args]` / `bun create ossido [args]` land here. This
// is a thin wrapper: it invokes the ossido CLI's `new` command (from the
// @ossido-labs/ossido-cli dependency), forwarding all args, so scaffolding logic
// lives in one place (the Rust CLI).

const { spawnSync } = require("node:child_process");

let launcher;
try {
  launcher = require.resolve("@ossido-labs/ossido-cli/bin/ossido.js");
} catch {
  console.error(
    "create-ossido: could not find @ossido-labs/ossido-cli. Reinstall so its " +
      "dependency is available.",
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [launcher, "new", ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) {
  console.error(`create-ossido: failed to run ossido new: ${result.error.message}`);
  process.exit(1);
}
if (result.signal) {
  process.kill(process.pid, result.signal);
}
process.exit(result.status == null ? 1 : result.status);
