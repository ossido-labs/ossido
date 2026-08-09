# ossido-mdx

MDX support for [ossido](https://ossido.dev), with a Next.js-style
`src/mdx-components.tsx` convention for styling Markdown globally — no
`<MDXProvider>` boilerplate.

## Usage

Install:

```sh
npm install ossido-mdx
```

Add the plugin to your ossido config:

```ts
// ossido.config.ts
import type { OssidoConfig } from 'ossido/config';
import { ossidoMdx } from 'ossido-mdx/vite';

const config: OssidoConfig = {
  vite: { plugins: [ossidoMdx()] },
};

export default config;
```

That's it — `.mdx` files under `src/routes` now compile and render.

## Global components

Create `src/mdx-components.tsx` and export a `useMDXComponents` function. Every
`.mdx` file uses it automatically (it's wired through MDX's `providerImportSource`,
so there's no provider to render):

```tsx
// src/mdx-components.tsx
import type { MDXComponents } from 'ossido-mdx';
import { Link } from 'ossido';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => <h1 className="text-3xl font-bold" {...props} />,
    a: ({ href = '', ...props }) => <Link href={href} {...props} />,
    // per-file components (passed to a rendered <MDXContent components={...} />)
    // still win:
    ...components,
  };
}
```

The file is optional: until it exists, MDX renders with plain HTML elements.

## Options

```ts
ossidoMdx({
  // forwarded to @mdx-js/rollup (remark/rehype plugins, etc.)
  mdxOptions: { remarkPlugins: [], rehypePlugins: [] },
});
```

`providerImportSource` is managed by the plugin and can't be overridden.
