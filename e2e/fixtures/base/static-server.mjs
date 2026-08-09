// Minimal, dependency-free static file server for the SSG e2e. Serves a
// directory the way a plain static host would — directory-index (`index.html`)
// resolution for extensionless routes and correct content types — so the
// `ossido build --static` export is exercised exactly as it would be deployed
// (no rewrites). Usage: `node static-server.mjs <root-dir> <port>`.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';

const [, , rootArg, portArg] = process.argv;
const root = normalize(join(process.cwd(), rootArg ?? 'out/static'));
const port = Number(portArg ?? 3001);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

async function resolveFile(url) {
  const decoded = decodeURIComponent(url.split('?')[0]);
  const filePath = normalize(join(root, decoded));
  // Prevent path traversal outside the served root.
  if (filePath !== root && !filePath.startsWith(root + '/')) return null;

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) {
      const indexPath = join(filePath, 'index.html');
      await stat(indexPath);
      return indexPath;
    }
    return filePath;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const filePath = await resolveFile(req.url ?? '/');
  if (!filePath) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
    return;
  }
  const body = await readFile(filePath);
  res.writeHead(200, {
    'content-type':
      CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream',
  });
  res.end(body);
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[ssg-static] serving ${root} on http://localhost:${port}`);
});
