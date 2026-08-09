import fs from 'fs/promises';

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
});
