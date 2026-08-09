# ossido-eslint-plugin

Lint rules [ossido](https://ossido.dev) projects should run. It exposes one rule
today —
[`react-refresh/only-export-components`](https://github.com/ArnaudBarre/eslint-plugin-react-refresh)
— authored with [oxlint](https://oxc.rs)'s performant `createOnce` API and
wrapped with `eslintCompatPlugin`, so the **same package runs under both oxlint
and ESLint**.

## Why

React Fast Refresh can only hot-update a module when **every** export is a
component. A single non-component export (an object, function, or class) next to
your component turns every edit to that file into a **full page reload** instead
of a state-preserving hot update — and on an SSR route, that reload refetches the
route's server data. (Primitive constant exports are fine; Vite handles them.)

The default export being the component doesn't help: the refresh boundary is the
whole module, so one disqualifying export poisons the file. This rule flags that
at author time, before you feel it in dev.

## Usage

Install:

```sh
npm install -D ossido-eslint-plugin
```

### oxlint (`.oxlintrc.json`)

```json
{
  "jsPlugins": ["ossido-eslint-plugin"],
  "rules": {
    "react-refresh/only-export-components": [
      "warn",
      { "allowConstantExport": true }
    ]
  }
}
```

> JS plugins are an alpha oxlint feature — requires an oxlint version that
> supports `jsPlugins`.

### ESLint (`eslint.config.js`, flat config)

```js
import reactRefresh from 'ossido-eslint-plugin';

export default [
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
];
```

`allowConstantExport: true` permits `export const FOO = 'bar'` (primitive
constants), which don't break Fast Refresh — matching the runtime behaviour.

## Fixing a warning

Move the non-component export to its own module:

```tsx
// page.tsx  — clean boundary, hot-updates with state preserved
import { PAGE_META } from './page.meta';
export default function Page() {
  /* ... */
}
```

```ts
// page.meta.ts
export const PAGE_META = { title: 'Home' };
```
