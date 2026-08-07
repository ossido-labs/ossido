// Serve the local `examples/` folder in the shape `ossido new` expects, so the
// scaffolder pulls from your working copy instead of GitHub — no published tag
// required.
//
// `ossido new` reads two GitHub endpoints, both rebased onto whatever URL is in
// the `__INTERNAL_OSSIDO_TEST` env var:
//   * the git API   (tree listing):  /repos/ChildishForces/ossido/git/...
//   * the raw files (file contents):  /ChildishForces/ossido/<ref>/<path>
// This server answers both from disk.
//
// Usage:
//   node scripts/serve-local-examples.mjs [port] [repo-root]
//
// Then, in another shell:
//   __INTERNAL_OSSIDO_TEST=http://localhost:8787 \
//     cargo run -p ossido -- new demo-app --head true --yes --tailwind
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { join, relative, normalize, resolve } from 'node:path'

const [, , portArg, rootArg] = process.argv
const port = Number(portArg ?? 8787)
// Resolve to an absolute path so the traversal guard below works even when the
// root is passed as a relative path like `.`.
const repoRoot = resolve(rootArg ?? process.cwd())
const examplesDir = join(repoRoot, 'examples')

// Directories that must never be part of a scaffolded template.
const IGNORED = new Set([
  'node_modules',
  'target',
  '.ossido',
  '.turbo',
  'out',
  'dist',
  '.git',
])

/** Walk examples/ and emit the GitHub `git/trees?recursive=1` shape. */
async function buildTree() {
  const tree = []

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED.has(entry.name)) continue
      if (entry.name === '.DS_Store') continue

      const abs = join(dir, entry.name)
      const path = relative(repoRoot, abs).split('\\').join('/')
      if (entry.isDirectory()) {
        tree.push({ path, type: 'tree' })
        await walk(abs)
      } else {
        tree.push({ path, type: 'blob' })
      }
    }
  }

  await walk(examplesDir)
  return { tree }
}

function sendJson(res, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(body)
}

const server = createServer(async (req, res) => {
  const path = (req.url ?? '/').split('?')[0]

  // Tag ref lookup (non --head path): any version resolves to a stub sha.
  if (path.includes('/git/ref/tags/')) {
    sendJson(res, { object: { sha: 'local' } })
    return
  }

  // Tree listing (both `main` and the stub sha route here).
  if (path.includes('/git/trees/')) {
    sendJson(res, await buildTree())
    return
  }

  // Raw file: /ChildishForces/ossido/<ref>/<path> -> <path> under the repo. Strip the
  // leading "", "ChildishForces", "ossido", "<ref>" segments.
  const parts = path.replace(/^\//, '').split('/')
  if (parts[0] === 'ChildishForces' && parts[1] === 'ossido' && parts.length >= 4) {
    const rel = parts.slice(3).join('/')
    const filePath = normalize(join(repoRoot, decodeURIComponent(rel)))
    // Prevent path traversal outside the repo root.
    if (filePath === repoRoot || filePath.startsWith(repoRoot + '/')) {
      try {
        const body = await readFile(filePath)
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end(body)
        return
      } catch {
        // fall through to 404
      }
    }
  }

  res.writeHead(404, { 'content-type': 'text/plain' })
  res.end('Not found')
})

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[local-examples] serving ${examplesDir} on http://localhost:${port}`)
})
