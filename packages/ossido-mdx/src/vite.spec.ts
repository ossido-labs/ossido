import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, it, expect } from 'vitest';
import type { Plugin } from 'vite';

import { ossidoMdx } from './vite';

const VIRTUAL_ID = 'virtual:ossido-mdx/components';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

// Vite hooks can be a function or a `{ handler }` object; normalise to a call.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function call(hook: any, ...args: Array<unknown>): any {
  const fn = typeof hook === 'function' ? hook : hook.handler;
  return fn(...args);
}

function componentsPlugin(): Plugin {
  return ossidoMdx()[0] as Plugin;
}

function mkTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ossido-mdx-'));
}

describe('ossidoMdx', () => {
  it('returns the components resolver plus the mdx plugin', () => {
    const plugins = ossidoMdx();
    expect(plugins).toHaveLength(2);
    expect(plugins[0]?.name).toBe('ossido-mdx:components');
  });

  it('resolves the virtual components id and ignores others', () => {
    const p = componentsPlugin();
    expect(call(p.resolveId, VIRTUAL_ID)).toBe(RESOLVED_ID);
    expect(call(p.resolveId, './something')).toBeUndefined();
  });

  it('loads a passthrough default when no mdx-components file exists', () => {
    const p = componentsPlugin();
    call(p.configResolved, { root: mkTmpDir() });
    const code = call(p.load, RESOLVED_ID) as string;
    expect(code).toContain('function useMDXComponents');
    expect(code).toContain('return components');
  });

  it('re-exports useMDXComponents from src/mdx-components (one dir up from the vite root)', () => {
    const p = componentsPlugin();
    // Mirror ossido's layout: vite root is `<project>/.ossido`, and the file
    // lives at `<project>/src/mdx-components.tsx`.
    const project = mkTmpDir();
    fs.mkdirSync(path.join(project, 'src'), { recursive: true });
    const file = path.join(project, 'src', 'mdx-components.tsx');
    fs.writeFileSync(file, 'export function useMDXComponents(c) { return c }');
    const viteRoot = path.join(project, '.ossido');
    fs.mkdirSync(viteRoot, { recursive: true });

    call(p.configResolved, { root: viteRoot });
    const code = call(p.load, RESOLVED_ID) as string;
    expect(code).toContain('export { useMDXComponents } from');
    // The emitted specifier is always POSIX-style (forward slashes), even on
    // Windows — see `ossidoMdx`'s `load`.
    expect(code).toContain('src/mdx-components.tsx');
  });
});
