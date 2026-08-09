/**
 * The map of components MDX renders HTML/JSX elements with. Return this from the
 * `useMDXComponents` export of your `src/mdx-components.tsx` to style Markdown
 * globally (see {@link ./vite | `ossido-mdx/vite`}).
 *
 * @example src/mdx-components.tsx
 * ```tsx
 * import type { MDXComponents } from '@ossido-labs/ossido-mdx'
 *
 * export function useMDXComponents(components: MDXComponents): MDXComponents {
 *   return {
 *     h1: (props) => <h1 className="text-3xl font-bold" {...props} />,
 *     ...components,
 *   }
 * }
 * ```
 */
export type { MDXComponents } from 'mdx/types';
