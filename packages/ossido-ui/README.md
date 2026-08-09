# ossido-ui

Default UI components and design tokens for [Ossido](https://ossido.dev) — the
React/Rust full-stack framework.

It provides the framework's built-in screens and the development error overlay
that Ossido renders out of the box: `BaseStyles`, `DefaultScreen`,
`DefaultError`, `DefaultLoading`, and the `DevErrorOverlay` stack.

## Entry points

- `ossido-ui` — the components and their types
- `ossido-ui/vite-plugin` — the Vite plugin that wires the design tokens/styles
  into the build

These are used internally by scaffolded Ossido apps; you can also import the
components directly to customise the default screens.

Check [ossido](https://github.com/ossido-labs/ossido) for more.
