#!/usr/bin/env node

import { runBuildHook } from '../dist/esm/build/index.js';

// Invoked by the Rust CLI as `ossido-run-build-hook <prebuild|postbuild>`.
runBuildHook(process.argv[2]);
