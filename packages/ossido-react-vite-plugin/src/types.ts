/**
 * A `loading.tsx` / `error.tsx` / `not-found.tsx` file. These are not routes —
 * they are attached to routes as the nearest-ancestor Suspense fallback /
 * error boundary / not-found UI.
 */
export interface SpecialFileNode {
  filePath: string;
  fullPath: string;
  variableName: string;
  /** Directory the file lives in, e.g. `.` or `posts` (forward-slashed). */
  dir: string;
}

export interface RouteNode {
  filePath: string;
  fullPath: string;
  routePath: string;
  path?: string;
  cleanedPath?: string;
  isLayout?: boolean;
  children?: Array<RouteNode>;
  parent?: RouteNode;
  variableName?: string;
  /** Nearest-ancestor `loading.tsx`, resolved at generation time. */
  loadingFile?: SpecialFileNode;
  /** Nearest-ancestor `error.tsx`, resolved at generation time. */
  errorFile?: SpecialFileNode;
  /** Nearest-ancestor `not-found.tsx`, resolved at generation time. */
  notFoundFile?: SpecialFileNode;
}

export interface Config {
  folderName: string;
  generatedRouteTree: string;
}
