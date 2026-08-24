import { describe, it, expect } from 'vitest';

import { createRouter } from './router';
import { createRoute, createRootRoute } from './route';

const component = (): null => null;

/** A minimal two-level tree: root wrapping the given child paths. */
function buildTree(paths: Array<string>): ReturnType<typeof createRootRoute> {
  const root = createRootRoute({ component });
  const children = paths.map((path) =>
    createRoute({ component }).update({
      path,
      getParentRoute: () => root,
    }),
  );
  return root.addChildren(children);
}

describe('Router#update with a new route tree (dev hot swap)', () => {
  it('rebuilds the lookup tables from scratch — removed routes stop matching', () => {
    const router = createRouter({ routeTree: buildTree(['/', '/about']) });
    expect(router.routesById['/about']).toBeDefined();

    // Swap in a tree without `/about` (the file was deleted).
    router.update({ routeTree: buildTree(['/']) });

    expect(router.routesById['/']).toBeDefined();
    expect(router.routesById['/about']).toBeUndefined();
    expect(router.routesByPath['/about']).toBeUndefined();
  });

  it('picks up routes added by the new tree', () => {
    const router = createRouter({ routeTree: buildTree(['/']) });
    expect(router.routesById['/blog']).toBeUndefined();

    router.update({ routeTree: buildTree(['/', '/blog']) });

    expect(router.routesById['/blog']).toBeDefined();
  });

  it('replaces the routesById object (invalidating identity-keyed caches)', () => {
    const router = createRouter({ routeTree: buildTree(['/']) });
    const before = router.routesById;

    router.update({ routeTree: buildTree(['/', '/new']) });

    // matchRoute's dynamic-route cache is a WeakMap keyed by this object; a
    // fresh identity per rebuild is what invalidates it.
    expect(router.routesById).not.toBe(before);
  });

  it('does not rebuild when the tree is unchanged', () => {
    const tree = buildTree(['/']);
    const router = createRouter({ routeTree: tree });
    const before = router.routesById;

    router.update({ routeTree: tree });

    expect(router.routesById).toBe(before);
  });
});
