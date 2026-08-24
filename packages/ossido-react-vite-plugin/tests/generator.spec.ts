import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { describe, it, expect } from 'vitest';

import { routeGenerator } from '../src/fs-routing/generator';

describe('generator works', async () => {
  const folderNames = await fs.readdir(`${process.cwd()}/tests/generator`);

  it.each(folderNames)(
    'should wire-up the routes for a "%s" tree',
    async (folderName) => {
      const testDirPath = `${process.cwd()}/tests/generator/${folderName}`;

      await routeGenerator({
        folderName: `${testDirPath}/routes`,
        generatedRouteTree: `${testDirPath}/routeTree.gen.ts`,
      });

      const generatedFilePath = `${testDirPath}/routeTree.gen.ts`;
      const expectedFilePath = `${testDirPath}/routeTree.expected.ts`;

      const generatedFileContent = await fs.readFile(
        generatedFilePath,
        'utf-8',
      );

      await expect(generatedFileContent).toMatchFileSnapshot(
        expectedFilePath,
        `${generatedFilePath} content should be equal to ${expectedFilePath}`,
      );
    },
  );

  it('emits a dev HMR accept block that swaps route components in place', async () => {
    const testDirPath = `${process.cwd()}/tests/generator/loading-error`;
    await routeGenerator({
      folderName: `${testDirPath}/routes`,
      generatedRouteTree: `${testDirPath}/routeTree.gen.ts`,
    });
    const content = await fs.readFile(
      `${testDirPath}/routeTree.gen.ts`,
      'utf-8',
    );

    // Guarded so prod builds dead-code-eliminate the block, and routed through
    // the shared helper that bumps the router hot store after reassigning.
    expect(content).toContain('if (import.meta.hot)');
    expect(content).toContain('import.meta.hot.accept(');
    expect(content).toContain('__ossido__internal__applyRouteHot');

    // Lazily-loaded pages swap via the wrapper's `.update()`; the root layout is
    // reassigned directly.
    expect(content).toContain('PageImport.update(');
    expect(content).toContain('rootRoute.component =');

    // A shared special file (the root `loading.tsx`) must fan out to every route
    // that resolved to it, not just one.
    expect(content).toContain('PageRoute.options.loadingComponent =');
    expect(content).toContain('AboutPageRoute.options.loadingComponent =');
  });

  it('emits a structural self-accept that swaps the new tree into the router', async () => {
    const testDirPath = `${process.cwd()}/tests/generator/single-level`;
    await routeGenerator({
      folderName: `${testDirPath}/routes`,
      generatedRouteTree: `${testDirPath}/routeTree.gen.ts`,
    });
    const content = await fs.readFile(
      `${testDirPath}/routeTree.gen.ts`,
      'utf-8',
    );

    // Self-accept (structural changes rewrite this module): the new tree is
    // applied in place; a failed re-evaluation escalates via invalidate().
    expect(content).toContain('import.meta.hot.accept((newModule) =>');
    expect(content).toContain(
      '__ossido__internal__applyRouteTree(newModule.routeTree)',
    );
    expect(content).toContain('import.meta.hot?.invalidate()');

    // Lazy wrappers carry their specifier so identity is cached across swaps.
    expect(content).toContain(
      "() => import('./routes/page'),\n  './routes/page',",
    );
  });
});

describe('route collection issues', () => {
  it('reports (and skips) a route file without a default export', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ossido-gen-'));
    const routes = path.join(dir, 'routes');
    await fs.mkdir(path.join(routes, 'about'), { recursive: true });
    // Valid root page; broken about page (named export only).
    await fs.writeFile(
      path.join(routes, 'page.tsx'),
      'export default function Page() { return null }\n',
    );
    await fs.writeFile(
      path.join(routes, 'about', 'page.tsx'),
      'export function AboutPage() { return null }\n',
    );

    const issues: Array<{ file: string; message: string }> = [];
    await routeGenerator(
      {
        folderName: routes,
        generatedRouteTree: path.join(dir, 'routeTree.gen.ts'),
      },
      (issue) => issues.push(issue),
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.file).toContain('about/page');
    expect(issues[0]?.message).toContain('no default export');

    // The broken route is skipped; the valid one still generates.
    const content = await fs.readFile(
      path.join(dir, 'routeTree.gen.ts'),
      'utf-8',
    );
    expect(content).toContain("path: '/'");
    expect(content).not.toContain('about');

    await fs.rm(dir, { recursive: true, force: true });
  });
});
