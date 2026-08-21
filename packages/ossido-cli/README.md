# @ossido-labs/ossido-cli

The [ossido](https://ossido.dev) command-line tool, distributed as a prebuilt native binary.

Installing this package pulls in the single platform-specific binary matching your
OS/CPU (via `optionalDependencies`) and exposes an `ossido` command.

```sh
npm install --save-dev @ossido-labs/ossido-cli
npx ossido --help
```

Most projects don't install this directly — it comes in with a scaffolded ossido app
(`npm create ossido@latest`) and is run through package scripts such as `ossido dev`
and `ossido build`.

## Supported platforms

| OS | Arch | Package |
| --- | --- | --- |
| macOS | arm64 | `@ossido-labs/cli-darwin-arm64` |
| macOS | x64 | `@ossido-labs/cli-darwin-x64` |
| Windows | x64 | `@ossido-labs/cli-win32-x64-msvc` |
| Linux (glibc) | x64 | `@ossido-labs/cli-linux-x64-gnu` |
| Linux (glibc) | arm64 | `@ossido-labs/cli-linux-arm64-gnu` |
| Linux (musl) | x64 | `@ossido-labs/cli-linux-x64-musl` |
| Linux (musl) | arm64 | `@ossido-labs/cli-linux-arm64-musl` |
| Linux (glibc) | armv7 | `@ossido-labs/cli-linux-arm-gnueabihf` |

Set `OSSIDO_BINARY_PATH` to point the launcher at a specific binary (useful for
local development against a source build).

## License

MIT
