import type { TraceMap } from '@jridgewell/trace-mapping'
import type { createStarryNight } from '@wooorm/starry-night'

// Minimal hast shapes (avoids a direct dependency on `@types/hast`).
interface HastText {
  type: 'text'
  value: string
}
interface HastElement {
  type: 'element'
  tagName: string
  properties?: Record<string, unknown>
  children: Array<HastNode>
}
type HastNode = HastText | HastElement
type ToHtml = (tree: { type: 'root'; children: Array<HastNode> }) => string

/**
 * Dev-only pipeline for the error overlay. Resolves a browser stack trace to
 * original source locations (via each module's sourcemap), then extracts and
 * syntax-highlights (starry-night) the source excerpt around the throwing
 * expression. Everything here is dynamically imported so it never ships in the
 * production client bundle.
 */

interface RawFrame {
  fn?: string
  file?: string
  line?: number
  column?: number
}

export interface ResolvedFrame {
  fn?: string
  file?: string
  line?: number
  column?: number
  isApp: boolean
}

export interface HighlightedLine {
  number: number
  /** Pre-highlighted HTML for the line (from starry-night). */
  html: string
  isErrorLine: boolean
}

export interface SourceExcerpt {
  file: string
  line: number
  column: number
  lines: Array<HighlightedLine>
}

export interface ResolvedDevError {
  frames: Array<ResolvedFrame>
  excerpt: SourceExcerpt | null
}

type StarryNight = Awaited<ReturnType<typeof createStarryNight>>

const SOURCE_CONTEXT = 5

// V8 / Chrome: `fn (url:line:col)` or `url:line:col` (after the `at ` prefix).
const V8_LINE = /^(?:(.*?)\s+)?\(?([^()]+):(\d+):(\d+)\)?$/
// SpiderMonkey / JavaScriptCore (Firefox, Safari): `fn@url:line:col`
// (`fn` may be empty). The url itself can contain `@` (vite's `@fs`), so the
// function name is only the part before the FIRST `@`.
const SPIDERMONKEY_LINE = /^(.*?)@(.+):(\d+):(\d+)$/
// Rust backtrace frame header: `<n>: <symbol>`, e.g. `10: my_app::route::handler`.
// Its `at <file>:<line>:<col>` location, when present, is on the following line.
const RUST_FRAME = /^\d+:\s+(.+)$/

export function parseStack(stack: string | undefined): Array<RawFrame> {
  if (!stack) return []

  const frames: Array<RawFrame> = []
  // A Rust frame symbol awaiting its (optional) `at <file>:<line>:<col>` line.
  let pendingFn: string | undefined

  const flushPending = (): void => {
    if (pendingFn !== undefined) {
      frames.push({ fn: pendingFn })
      pendingFn = undefined
    }
  }

  for (const rawLine of stack.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const rustFrame = line.match(RUST_FRAME)
    if (rustFrame) {
      // A new symbol: the previous one had no location line, emit it as-is.
      flushPending()
      pendingFn = rustFrame[1]
      continue
    }

    if (line.startsWith('at ')) {
      const match = line.slice(3).trim().match(V8_LINE)
      if (match) {
        frames.push({
          // Prefer a Rust symbol captured from the preceding frame header.
          fn: pendingFn ?? (match[1]?.trim() || undefined),
          file: match[2],
          line: Number(match[3]),
          column: Number(match[4]),
        })
      } else {
        frames.push({ fn: pendingFn ?? line.slice(3).trim() })
      }
      pendingFn = undefined
      continue
    }

    const match = line.match(SPIDERMONKEY_LINE)
    if (match) {
      flushPending()
      frames.push({
        fn: match[1] || undefined,
        file: match[2],
        line: Number(match[3]),
        column: Number(match[4]),
      })
    }
  }

  flushPending()
  return frames
}

/**
 * The most specific label for an error: its constructor (class) name when it is
 * more descriptive than the generic `Error`. A subclass like `TestError` keeps
 * `error.name === 'Error'` unless it explicitly sets `name`, but its
 * constructor name is still `TestError`.
 */
export function errorLabel(error: Error): string {
  const constructorName = error.constructor?.name
  if (
    constructorName &&
    constructorName !== 'Error' &&
    constructorName !== 'Object'
  ) {
    return constructorName
  }
  return error.name || 'Error'
}

function isApplicationFile(file: string | undefined): boolean {
  if (!file) return false
  return (
    !file.includes('node_modules') &&
    !file.includes('/deps/') &&
    !file.startsWith('node:') &&
    // Rust stdlib / toolchain / registry frames are vendor noise, not app code.
    !file.includes('/rustc/') &&
    !file.includes('/rustlib/') &&
    !file.includes('/.cargo/registry')
  )
}

/** Collapse `foo/../` segments (e.g. Rust's `.tuono/../src/...` → `src/...`). */
function collapseParentDirs(path: string): string {
  const out: Array<string> = []
  for (const part of path.split('/')) {
    const prev = out[out.length - 1]
    if (part === '..' && prev !== undefined && prev !== '' && prev !== '..') {
      out.pop()
    } else {
      out.push(part)
    }
  }
  return out.join('/')
}

/** Strip origin and query for a readable path. */
export function prettyPath(file: string): string {
  const withoutQuery = file.replace(/\?.*$/, '')
  let pathname = withoutQuery
  try {
    pathname = new URL(withoutQuery).pathname
  } catch {
    // already a path
  }
  return collapseParentDirs(
    pathname.replace(/^\/vite-server/, '').replace(/^\/@fs/, ''),
  )
}

/** Resolve a sourcemap `source` (relative) against the served module path. */
function resolveSourcePath(frameFile: string, source: string): string {
  const clean = frameFile.replace(/\?.*$/, '')
  try {
    const url = new URL(clean)
    const resolved = new URL(source, `https://host${url.pathname}`).pathname
    return resolved.replace(/^\/vite-server/, '').replace(/^\/@fs/, '')
  } catch {
    return source
  }
}

function extensionOf(file: string): string {
  const match = file.replace(/\?.*$/, '').match(/\.(tsx|ts|jsx|js|mjs|cjs|rs)$/)
  return match ? `.${match[1]}` : '.js'
}

/** Immediate (unmapped) frames for the first paint before async resolution. */
export function initialFrames(stack: string | undefined): Array<ResolvedFrame> {
  return parseStack(stack).map((frame) => ({
    fn: frame.fn,
    file: frame.file ? prettyPath(frame.file) : undefined,
    line: frame.line,
    column: frame.column,
    isApp: isApplicationFile(frame.file),
  }))
}

async function loadSourceMap(
  moduleUrl: string,
  cache: Map<string, TraceMap | null>,
  TraceMapCtor: typeof TraceMap,
): Promise<TraceMap | null> {
  const key = moduleUrl.replace(/\?.*$/, '')
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  let map: TraceMap | null = null
  try {
    let json: unknown = null
    const mapResponse = await fetch(`${key}.map`)
    if (mapResponse.ok) {
      json = await mapResponse.json()
    } else {
      const moduleResponse = await fetch(moduleUrl)
      if (moduleResponse.ok) {
        const text = await moduleResponse.text()
        const inline = text.match(
          /sourceMappingURL=data:application\/json;(?:charset=[^;,]+;)?base64,([A-Za-z0-9+/=]+)/,
        )
        if (inline?.[1]) json = JSON.parse(atob(inline[1]))
      }
    }
    if (json)
      map = new TraceMapCtor(json as ConstructorParameters<typeof TraceMap>[0])
  } catch {
    map = null
  }

  cache.set(key, map)
  return map
}

/** Split a hast tree into per-line lists of nodes (handles multi-line tokens). */
function splitLines(nodes: Array<HastNode>): Array<Array<HastNode>> {
  const lines: Array<Array<HastNode>> = [[]]
  const pushCurrent = (node: HastNode): void => {
    lines[lines.length - 1]?.push(node)
  }

  for (const node of nodes) {
    if (node.type === 'text') {
      const segments = node.value.split('\n')
      segments.forEach((segment, index) => {
        if (index > 0) lines.push([])
        if (segment !== '') pushCurrent({ type: 'text', value: segment })
      })
    } else {
      const childLines = splitLines(node.children)
      childLines.forEach((children, index) => {
        if (index > 0) lines.push([])
        if (children.length) pushCurrent({ ...node, children })
      })
    }
  }
  return lines
}

function buildExcerpt(
  starryNight: StarryNight,
  toHtml: ToHtml,
  source: string,
  file: string,
  errorLine: number,
  errorColumn: number,
): SourceExcerpt {
  const scope = starryNight.flagToScope(extensionOf(file)) ?? 'source.js'
  const tree = starryNight.highlight(source, scope)
  const lines = splitLines(tree.children as unknown as Array<HastNode>)

  const start = Math.max(1, errorLine - SOURCE_CONTEXT)
  const end = Math.min(lines.length, errorLine + SOURCE_CONTEXT)

  const highlighted: Array<HighlightedLine> = []
  for (let number = start; number <= end; number++) {
    highlighted.push({
      number,
      html: toHtml({ type: 'root', children: lines[number - 1] ?? [] }),
      isErrorLine: number === errorLine,
    })
  }

  return { file, line: errorLine, column: errorColumn, lines: highlighted }
}

let starryNightPromise: Promise<StarryNight> | null = null

async function getStarryNight(): Promise<StarryNight> {
  if (!starryNightPromise) {
    starryNightPromise = (async (): Promise<StarryNight> => {
      const { createStarryNight } = await import('@wooorm/starry-night')
      const grammars = await Promise.all([
        import('@wooorm/starry-night/source.tsx'),
        import('@wooorm/starry-night/source.ts'),
        import('@wooorm/starry-night/source.js'),
        import('@wooorm/starry-night/source.rust'),
      ])
      return createStarryNight(grammars.map((grammar) => grammar.default))
    })()
  }
  return starryNightPromise
}

/**
 * Highlight an excerpt from source content the server already provided (a Rust
 * panic site — see `ServerErrorSource`). No sourcemap resolution is involved:
 * the content is highlighted directly (starry-night picks the grammar from the
 * file extension, e.g. `.rs`). Returns `null` if the dev-only libraries fail to
 * load.
 */
export async function buildServerSourceExcerpt(source: {
  file: string
  line: number
  column: number
  content: string
}): Promise<SourceExcerpt | null> {
  try {
    const [starryNight, htmlModule] = await Promise.all([
      getStarryNight(),
      import('hast-util-to-html'),
    ])
    const toHtml = htmlModule.toHtml as unknown as ToHtml
    return buildExcerpt(
      starryNight,
      toHtml,
      source.content,
      prettyPath(source.file),
      source.line,
      source.column,
    )
  } catch {
    return null
  }
}

/**
 * Resolve stack frames to original locations and produce a syntax-highlighted
 * excerpt around the top application frame. Falls back to unmapped frames if any
 * of the dev-only libraries fail to load.
 */
export async function resolveDevError(
  stack: string | undefined,
): Promise<ResolvedDevError> {
  const rawFrames = parseStack(stack)

  try {
    const [traceMapping, starryNight, htmlModule] = await Promise.all([
      import('@jridgewell/trace-mapping'),
      getStarryNight(),
      import('hast-util-to-html'),
    ])
    const { TraceMap, originalPositionFor, sourceContentFor } = traceMapping
    const toHtml = htmlModule.toHtml as unknown as ToHtml

    const mapCache = new Map<string, TraceMap | null>()
    const frames: Array<ResolvedFrame> = []
    let excerpt: SourceExcerpt | null = null

    for (const frame of rawFrames) {
      if (!frame.file || frame.line == null) {
        frames.push({ fn: frame.fn, isApp: false })
        continue
      }

      const isApp = isApplicationFile(frame.file)
      let file = prettyPath(frame.file)
      let line = frame.line
      let column = frame.column ?? 1
      let content: string | null | undefined = null

      // Only application frames are worth mapping (vendor frames are noise).
      if (isApp) {
        const map = await loadSourceMap(frame.file, mapCache, TraceMap)
        if (map) {
          const original = originalPositionFor(map, {
            line: frame.line,
            column: (frame.column ?? 1) - 1,
          })
          if (original.source != null && original.line != null) {
            file = resolveSourcePath(frame.file, original.source)
            line = original.line
            column = (original.column ?? 0) + 1
            content = sourceContentFor(map, original.source)
          }
        }
      }

      frames.push({ fn: frame.fn, file, line, column, isApp })

      if (!excerpt && isApp && content) {
        excerpt = buildExcerpt(starryNight, toHtml, content, file, line, column)
      }
    }

    return { frames, excerpt }
  } catch {
    return { frames: initialFrames(stack), excerpt: null }
  }
}
