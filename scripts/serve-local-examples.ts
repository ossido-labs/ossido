import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, normalize, resolve } from 'node:path';

const [, , portArg, rootArg] = process.argv;
const port = Number(portArg ?? 8787);
const repoRoot = resolve(rootArg ?? process.cwd());
const examplesDir = join(repoRoot, 'examples');

// Directories that must never be part of a scaffolded template.
const IGNORED = new Set([
  'node_modules',
  'target',
  '.ossido',
  '.turbo',
  'out',
  'dist',
  '.git',
]);

/** A single entry of the GitHub `git/trees?recursive=1` response. */
interface TreeEntry {
  path: string;
  type: 'tree' | 'blob';
}

/** Walk `examples/` and emit the GitHub `git/trees?recursive=1` shape. */
async function buildTree(): Promise<{ tree: Array<TreeEntry> }> {
  const tree: Array<TreeEntry> = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED.has(entry.name)) continue;
      if (entry.name === '.DS_Store') continue;

      const abs = join(dir, entry.name);
      const path = relative(repoRoot, abs).split('\\').join('/');
      if (entry.isDirectory()) {
        tree.push({ path, type: 'tree' });
        await walk(abs);
      } else {
        tree.push({ path, type: 'blob' });
      }
    }
  }

  await walk(examplesDir);
  return { tree };
}

function sendJson(res: ServerResponse, body: unknown): void {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function sendText(
  res: ServerResponse,
  status: number,
  body: string | Buffer,
): void {
  res.writeHead(status, { 'content-type': 'text/plain' });
  res.end(body);
}

/**
 * Resolve a raw-file request (`/ossido-labs/ossido/<ref>/<path>`) to an
 * absolute path under `repoRoot`, or `null` when it isn't a raw-file request or
 * would escape the root (path-traversal guard).
 */
function resolveRawFilePath(requestPath: string): string | null {
  const parts = requestPath.replace(/^\//, '').split('/');
  if (parts[0] !== 'ossido-labs' || parts[1] !== 'ossido' || parts.length < 4) {
    return null;
  }

  const rel = parts.slice(3).join('/');
  const filePath = normalize(join(repoRoot, decodeURIComponent(rel)));
  const pathsEqual = filePath === repoRoot;
  const withinRoot = pathsEqual || filePath.startsWith(`${repoRoot}/`);
  return withinRoot ? filePath : null;
}

const server = createServer(
  async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const path = (req.url ?? '/').split('?')[0] ?? '/';

    // Tag ref lookup (non `--head` path): any version resolves to a stub sha.
    if (path.includes('/git/ref/tags/')) {
      sendJson(res, { object: { sha: 'local' } });
      return;
    }

    // Tree listing (both `main` and the stub sha route here).
    if (path.includes('/git/trees/')) {
      sendJson(res, await buildTree());
      return;
    }

    // Raw file contents.
    const filePath = resolveRawFilePath(path);
    if (filePath) {
      try {
        sendText(res, 200, await readFile(filePath));
        return;
      } catch {
        // Fall through to 404.
      }
    }

    sendText(res, 404, 'Not found');
  },
);

server.listen(port, (): void => {
  console.log(
    `[local-examples] serving ${examplesDir} on http://localhost:${port}`,
  );
});
