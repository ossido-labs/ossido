import * as fsp from 'fs/promises'
import path from 'path'

import { format } from 'oxfmt'

import type { Config, RouteNode, SpecialFileNode } from '../types'

import { buildRouteConfig } from './build-route-config'
import { hasParentRoute } from './has-parent-route'
import {
  cleanPath,
  determineNodePath,
  multiSortBy,
  replaceBackslash,
  removeExt,
  routePathToVariable,
  removeGroups,
  removeLastSlash,
  removeUnderscores,
} from './utils'

import {
  ROUTES_FOLDER,
  PAGE_FILE_ID,
  LAYOUT_PATH_ID,
  LOADING_FILE_ID,
  ERROR_FILE_ID,
  NOT_FOUND_FILE_ID,
  GENERATED_ROUTE_TREE,
  DYNAMIC_FN,
} from './constants'

import { sortRouteNodes } from './sort-route-nodes'
import isDefaultExported from './is-default-exported'

let latestTask = 0

const defaultConfig: Config = {
  folderName: ROUTES_FOLDER,
  generatedRouteTree: GENERATED_ROUTE_TREE,
}

let isFirst = false
let skipMessage = false

/** Directory a forward-slashed file path lives in (`.` for the root). */
function dirKey(filePath: string): string {
  const idx = filePath.lastIndexOf('/')
  return idx === -1 ? '.' : filePath.slice(0, idx)
}

function parentDir(dir: string): string {
  const idx = dir.lastIndexOf('/')
  return idx === -1 ? '.' : dir.slice(0, idx)
}

/** Walk up the directory tree to the closest special file. */
function findNearestSpecialFile(
  startDir: string,
  filesByDir: Map<string, SpecialFileNode>,
): SpecialFileNode | undefined {
  let current = startDir || '.'
  for (;;) {
    const found = filesByDir.get(current)
    if (found) return found
    if (current === '.') return undefined
    current = parentDir(current)
  }
}

interface RouteNodesResult {
  routeNodes: Array<RouteNode>
  rustHandlersNodes: Array<string>
  loadingFiles: Array<SpecialFileNode>
  errorFiles: Array<SpecialFileNode>
  notFoundFiles: Array<SpecialFileNode>
}

async function getRouteNodes(
  config = defaultConfig,
): Promise<RouteNodesResult> {
  const routeNodes: Array<RouteNode> = []
  const rustHandlersNodes: Array<string> = []
  const loadingFiles: Array<SpecialFileNode> = []
  const errorFiles: Array<SpecialFileNode> = []
  const notFoundFiles: Array<SpecialFileNode> = []

  async function recurse(dir: string): Promise<void> {
    const fullDir = path.resolve(config.folderName, dir)
    const dirList = await fsp.readdir(fullDir, { withFileTypes: true })

    await Promise.all(
      dirList.map(async (dirent) => {
        const fullPath = path.join(fullDir, dirent.name)
        const relativePath = path.join(dir, dirent.name)

        if (dirent.isDirectory()) {
          await recurse(relativePath)
        } else if (fullPath.match(/\.(tsx|ts|jsx|js|mdx)$/)) {
          const isScript = Boolean(fullPath.match(/\.(tsx|ts|jsx|js)$/))
          const baseName = removeExt(dirent.name)
          const filePath = replaceBackslash(path.join(dir, dirent.name))

          // `loading` / `error` / `not-found` are not routes — collect them
          // separately so they can be attached to routes as nearest-ancestor
          // metadata (Suspense fallback / error boundary / not-found UI).
          if (
            baseName === LOADING_FILE_ID ||
            baseName === ERROR_FILE_ID ||
            baseName === NOT_FOUND_FILE_ID
          ) {
            const specialFile: SpecialFileNode = {
              filePath,
              fullPath,
              variableName: routePathToVariable(`/${removeExt(filePath)}`),
              dir: dirKey(filePath),
            }
            if (baseName === LOADING_FILE_ID) loadingFiles.push(specialFile)
            else if (baseName === ERROR_FILE_ID) errorFiles.push(specialFile)
            else notFoundFiles.push(specialFile)
            return
          }

          // Only `page` (the route leaf for its directory) and `layout` (the
          // shared wrapper) are routes. Everything else in `src/routes` is
          // ignored, so components can be colocated next to a page.
          if (baseName !== PAGE_FILE_ID && baseName !== LAYOUT_PATH_ID) {
            return
          }

          // Check that the route is correctly default exported
          if (
            isScript &&
            !isDefaultExported((await fsp.readFile(fullPath)).toString())
          ) {
            return
          }

          const filePathNoExt = removeExt(filePath)
          let routePath = cleanPath(`/${filePathNoExt}`) || ''

          const variableName = routePathToVariable(routePath)

          // A `page` maps to its containing directory: `about/page` → `/about`,
          // the root `page` → `/`. `layout` keeps its `/layout` suffix, which
          // marks it as a layout throughout the rest of the pipeline.
          if (baseName === PAGE_FILE_ID) {
            routePath = routePath.replace(/\/page$/, '/') || '/'
          }

          routeNodes.push({
            filePath,
            fullPath,
            routePath,
            variableName,
          })
        } else if (fullPath.match(/\.(rs)$/)) {
          // `page.rs` (page data) and `layout.rs` (layout data) are handler
          // nodes; API handlers and middleware are wired on the Rust side only.
          const rsBaseName = removeExt(dirent.name)
          if (rsBaseName !== PAGE_FILE_ID && rsBaseName !== LAYOUT_PATH_ID) return

          const filePath = replaceBackslash(path.join(dir, dirent.name))
          const filePathNoExt = removeExt(filePath)
          let routePath = cleanPath(`/${filePathNoExt}`) || ''

          if (rsBaseName === PAGE_FILE_ID) {
            routePath = routePath.replace(/\/page$/, '/') || '/'
          }

          rustHandlersNodes.push(routePath)
        }
      }),
    )
  }

  await recurse('./')

  return { routeNodes, rustHandlersNodes, loadingFiles, errorFiles, notFoundFiles }
}

export async function routeGenerator(
  config: Config = defaultConfig,
): Promise<void> {
  if (!isFirst) {
    isFirst = true
  } else if (skipMessage) {
    skipMessage = false
  }

  const checkLatest = (): boolean => {
    if (latestTask !== taskId) {
      skipMessage = true
      return false
    }

    return true
  }

  const taskId = latestTask + 1
  latestTask = taskId

  const {
    routeNodes: beforeRouteNodes,
    rustHandlersNodes,
    loadingFiles,
    errorFiles,
    notFoundFiles,
  } = await getRouteNodes(config)

  const preRouteNodes = sortRouteNodes(beforeRouteNodes)

  const routeNodes: Array<RouteNode> = []

  // Loop over the flat list of routeNodes and
  // build up a tree based on the routeNodes' routePath
  const handleNode = (node: RouteNode): void => {
    const parentRoute = hasParentRoute(routeNodes, node, node.routePath)

    if (parentRoute) node.parent = parentRoute

    node.path = determineNodePath(node)

    node.cleanedPath = removeLastSlash(
      removeGroups(removeUnderscores(node.path) ?? ''),
    )

    if (node.parent) {
      node.parent.children = node.parent.children ?? []
      node.parent.children.push(node)
    }
    routeNodes.push(node)
  }

  for (const node of preRouteNodes) {
    handleNode(node)
  }

  // Resolve the nearest-ancestor loading/error/not-found file for each
  // (non-layout) route and remember which special files are actually
  // referenced (so only those get imported).
  const loadingByDir = new Map(loadingFiles.map((file) => [file.dir, file]))
  const errorByDir = new Map(errorFiles.map((file) => [file.dir, file]))
  const notFoundByDir = new Map(notFoundFiles.map((file) => [file.dir, file]))
  const usedSpecialFiles = new Map<string, SpecialFileNode>()

  for (const node of routeNodes) {
    if (node.routePath.endsWith(LAYOUT_PATH_ID)) continue
    const nodeDir = dirKey(node.filePath)
    node.loadingFile = findNearestSpecialFile(nodeDir, loadingByDir)
    node.errorFile = findNearestSpecialFile(nodeDir, errorByDir)
    node.notFoundFile = findNearestSpecialFile(nodeDir, notFoundByDir)
    if (node.loadingFile) {
      usedSpecialFiles.set(node.loadingFile.filePath, node.loadingFile)
    }
    if (node.errorFile) {
      usedSpecialFiles.set(node.errorFile.filePath, node.errorFile)
    }
    if (node.notFoundFile) {
      usedSpecialFiles.set(node.notFoundFile.filePath, node.notFoundFile)
    }
  }

  // The root `not-found.tsx` is the global not-found UI (rendered when no route
  // matches at all). Always import it when present.
  const rootNotFoundFile = notFoundFiles.find((file) => file.dir === '.')
  if (rootNotFoundFile) {
    usedSpecialFiles.set(rootNotFoundFile.filePath, rootNotFoundFile)
  }

  const specialImports = [...usedSpecialFiles.values()]
    .sort((a, b) => a.variableName.localeCompare(b.variableName))
    .map(
      (file) =>
        `import ${file.variableName}Import from './${replaceBackslash(
          removeExt(
            path.relative(
              path.dirname(config.generatedRouteTree),
              path.resolve(config.folderName, file.filePath),
            ),
          ),
        )}'`,
    )
    .join('\n')

  const routeConfigChildrenText = buildRouteConfig(routeNodes)

  const sortedRouteNodes = multiSortBy(routeNodes, [
    (d): number => (d.routePath.includes(`/${LAYOUT_PATH_ID}`) ? -1 : 1),
    (d): number => d.routePath.split('/').length,
    (d): number => (d.routePath.endsWith("index'") ? -1 : 1),
    (d): RouteNode => d,
  ])

  const imports = [
    ...sortedRouteNodes.map((node) => {
      const extension = node.filePath.endsWith('mdx') ? '.mdx' : ''
      return `const ${
        node.variableName as string
      }Import = ${DYNAMIC_FN}(() => import('./${replaceBackslash(
        removeExt(
          path.relative(
            path.dirname(config.generatedRouteTree),
            path.resolve(config.folderName, node.filePath),
          ),
          false,
        ),
      )}${extension}'))`
    }),
  ].join('\n')

  const createRoutes = [
    ...sortedRouteNodes.map((node) => {
      const isRoot = node.routePath.endsWith(LAYOUT_PATH_ID)
      const rootDeclaration = isRoot ? ', isRoot: true' : ''
      const variableName = node.variableName as string

      return `const ${variableName} = createRoute({ component: ${variableName}Import${rootDeclaration} })`
    }),
  ].join('\n')

  const createRouteUpdates = [
    sortedRouteNodes
      .map((node) => {
        const variableName = node.variableName as string
        const cleanedPath = node.cleanedPath as string
        return [
          `const ${variableName}Route = ${variableName}.update({
          ${[
            !node.path?.endsWith(LAYOUT_PATH_ID) && `path: '${cleanedPath}'`,
            `getParentRoute: () => ${node.parent?.variableName ?? 'root'}Route`,
            rustHandlersNodes.includes(node.path || '')
              ? 'hasHandler: true'
              : '',
            `filePath: '${node.path || '/'}'`,
            // The route's source file path, matching the Rust route key — used to
            // seed/read its server data (page or layout).
            `dataKey: '/${removeExt(node.filePath)}'`,
            node.loadingFile
              ? `loadingComponent: ${node.loadingFile.variableName}Import`
              : '',
            node.errorFile
              ? `errorComponent: ${node.errorFile.variableName}Import`
              : '',
            node.notFoundFile
              ? `notFoundComponent: ${node.notFoundFile.variableName}Import`
              : '',
          ]
            .filter(Boolean)
            .join(',')}
        })`,
        ].join('')
      })
      .join('\n\n'),
  ]

  // The root layout's data key is its source file (`layout`); it has a handler
  // when a root `layout.rs` was collected.
  const rootLayoutHasHandler = rustHandlersNodes.includes('/layout')
  const rootRouteDeclaration = `const rootRoute = createRoute({ isRoot: true, component: RootLayoutImport, dataKey: '/layout'${
    rootLayoutHasHandler ? ', hasHandler: true' : ''
  }${
    rootNotFoundFile
      ? `, notFoundComponent: ${rootNotFoundFile.variableName}Import`
      : ''
  } });`

  const routeImports = [
    '// This file is auto-generated by Tuono',
    `import { createRoute, ${DYNAMIC_FN} } from 'tuono'`,
    [
      `import RootLayoutImport from './${replaceBackslash(
        path.relative(
          path.dirname(config.generatedRouteTree),
          path.resolve(config.folderName, LAYOUT_PATH_ID),
        ),
      )}'`,
    ].join('\n'),
    specialImports,
    imports,
    rootRouteDeclaration,
    createRoutes,
    '// Create/Update Routes',
    createRouteUpdates,
    '// Create and export the route tree',
    `export const routeTree = rootRoute.addChildren([${routeConfigChildrenText}])`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const { code: routeConfigFileContent } = await format(
    config.generatedRouteTree,
    routeImports,
    {
      semi: false,
      singleQuote: true,
      printWidth: 80,
    },
  )

  const routeTreeContent = await fsp
    .readFile(path.resolve(config.generatedRouteTree), 'utf-8')
    .catch((e: unknown) => {
      const err = e as Error & { code?: string }
      if (err.code === 'ENOENT') {
        return undefined
      }
      throw err
    })

  if (!checkLatest()) return

  if (routeTreeContent !== routeConfigFileContent) {
    await fsp.mkdir(path.dirname(path.resolve(config.generatedRouteTree)), {
      recursive: true,
    })
    if (!checkLatest()) return
    await fsp.writeFile(
      path.resolve(config.generatedRouteTree),
      routeConfigFileContent,
    )
  }
}
