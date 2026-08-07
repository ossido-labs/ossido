import { describe, it, expect } from 'vitest'

import { sortRouteNodes } from './sort-route-nodes'

const base =
  '/ossido/packages/ossido-react-vite-plugin/tests/generator/multi-level-root-dynamic/routes'

const page = {
  filePath: 'page.tsx',
  fullPath: `${base}/page.tsx`,
  routePath: '/',
  variableName: 'Page',
  path: '/',
  cleanedPath: '/',
}
const aboutPage = {
  filePath: 'about/page.tsx',
  fullPath: `${base}/about/page.tsx`,
  routePath: '/about/',
  variableName: 'AboutPage',
}
const rootLayout = {
  filePath: 'layout.tsx',
  fullPath: `${base}/layout.tsx`,
  routePath: '/layout',
  variableName: 'root',
}
const postsPost = {
  filePath: 'posts/[post]/page.tsx',
  fullPath: `${base}/posts/[post]/page.tsx`,
  routePath: '/posts/[post]/',
  variableName: 'PostspostPage',
}
const postsMyPost = {
  filePath: 'posts/my-post/page.tsx',
  fullPath: `${base}/posts/my-post/page.tsx`,
  routePath: '/posts/my-post/',
  variableName: 'PostsMyPostPage',
}
const postsPage = {
  filePath: 'posts/page.tsx',
  fullPath: `${base}/posts/page.tsx`,
  routePath: '/posts/',
  variableName: 'PostsPage',
}
const postsLayout = {
  filePath: 'posts/layout.tsx',
  fullPath: `${base}/posts/layout.tsx`,
  routePath: '/posts/layout',
  variableName: 'PostsLayout',
}

const routes = [
  page,
  aboutPage,
  rootLayout,
  postsPost,
  postsMyPost,
  postsPage,
  postsLayout,
]

// The root `/` first, the root `layout` filtered out, then shallower paths
// before deeper ones and a directory's `layout` before its `page` — so parents
// are always processed before children when building the tree.
const expectedSorting = [
  page,
  postsLayout,
  aboutPage,
  postsPage,
  postsPost,
  postsMyPost,
]

describe('sortRouteNodes works', () => {
  it('should correctly sort the nodes', () => {
    const sorted = sortRouteNodes(routes)

    expect(sorted).toStrictEqual(expectedSorting)
  })
})
