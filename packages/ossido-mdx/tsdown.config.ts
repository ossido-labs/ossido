import { defineBuildConfig } from 'vite-config'

export default defineBuildConfig({
  // The `MDXComponents` type re-export (index) and the Vite plugin (vite),
  // exposed as the `ossido-mdx/vite` subpath.
  entry: ['./src/index.ts', './src/vite.ts'],
})
