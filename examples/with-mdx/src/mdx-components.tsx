import type { MDXComponents } from 'ossido-mdx'

/**
 * Global components every `.mdx` file renders with — the ossido equivalent of
 * Next.js's `mdx-components.tsx`. Wired up automatically by `ossidoMdx()` in
 * `ossido.config.ts`; no `<MDXProvider>` needed.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => <h1 className="mdx-h1" {...props} />,
    a: (props) => <a className="mdx-link" {...props} />,
    // Per-file overrides (passed to a rendered `<Content components={...} />`)
    // still take precedence.
    ...components,
  }
}
