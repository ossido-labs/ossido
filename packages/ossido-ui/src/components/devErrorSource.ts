import type { TraceMap } from '@jridgewell/trace-mapping'
import type { HighlighterCore } from 'shiki/core'

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
 * syntax-highlights (Shiki) the source excerpt around the throwing expression.
 * Everything here is dynamically imported so it never ships in the production
 * client bundle.
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
  /** Pre-highlighted HTML for the line (from Shiki, inline-styled). */
  html: string
  isErrorLine: boolean
}

/** A single source line as plain text — shown before highlighting is ready. */
export interface PlainLine {
  number: number
  text: string
  isErrorLine: boolean
}

export interface SourceExcerpt {
  file: string
  line: number
  column: number
  lines: Array<HighlightedLine>
}

/** The excerpt in plain text, before Shiki has highlighted it. */
export interface PlainExcerpt {
  file: string
  line: number
  column: number
  lines: Array<PlainLine>
}

/** Source content around a throwing location — the input to an excerpt. */
export interface RawExcerptSource {
  content: string
  file: string
  line: number
  column: number
}

const SOURCE_CONTEXT = 5

/** Map a source file extension to the Shiki grammar (language) to load. */
function langForFile(
  file: string,
): 'tsx' | 'typescript' | 'javascript' | 'rust' {
  switch (extensionOf(file)) {
    case '.tsx':
    case '.jsx':
      return 'tsx'
    case '.ts':
      return 'typescript'
    case '.rs':
      return 'rust'
    default:
      return 'javascript'
  }
}

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

/** Collapse `foo/../` segments (e.g. Rust's `.ossido/../src/...` → `src/...`). */
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

/**
 * Pull the per-line `<span class="line">` elements out of Shiki's `codeToHast`
 * output (`root > pre > code > span.line*`). Shiki already delimits lines, so no
 * manual line-splitting is needed.
 */
function extractLineNodes(tree: {
  children: Array<HastNode>
}): Array<Array<HastNode>> {
  const pre = tree.children.find(
    (node): node is HastElement =>
      node.type === 'element' && node.tagName === 'pre',
  )
  const code = pre?.children.find(
    (node): node is HastElement =>
      node.type === 'element' && node.tagName === 'code',
  )
  // Shiki tags each line as `<span class="line">` (a raw `class` string, not the
  // hast-normalized `className` array), separated by `\n` text nodes.
  const lineNodes = (code?.children ?? []).filter(
    (node): node is HastElement =>
      node.type === 'element' && node.properties?.['class'] === 'line',
  )
  return lineNodes.map((line) => line.children)
}

/**
 * Slice the source into the context window around the throwing line, as plain
 * text. Synchronous and dependency-free, so the excerpt can render immediately;
 * syntax highlighting then swaps in over the same layout (see
 * {@link highlightExcerpt}).
 */
export function extractExcerpt(src: RawExcerptSource): PlainExcerpt {
  const allLines = src.content.split('\n')
  const start = Math.max(1, src.line - SOURCE_CONTEXT)
  const end = Math.min(allLines.length, src.line + SOURCE_CONTEXT)
  const lines: Array<PlainLine> = []
  for (let number = start; number <= end; number++) {
    lines.push({
      number,
      text: allLines[number - 1] ?? '',
      isErrorLine: number === src.line,
    })
  }
  return { file: src.file, line: src.line, column: src.column, lines }
}

function buildExcerpt(
  highlighter: HighlighterCore,
  toHtml: ToHtml,
  source: string,
  file: string,
  errorLine: number,
  errorColumn: number,
): SourceExcerpt {
  const tree = highlighter.codeToHast(source, {
    lang: langForFile(file),
    theme: 'github-dark',
  }) as unknown as { children: Array<HastNode> }
  const lines = extractLineNodes(tree)

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

let highlighterPromise: Promise<HighlighterCore> | null = null

/**
 * Build a fine-grained Shiki highlighter: the tree-shakeable core, the pure-JS
 * regex engine (no oniguruma WASM), and only the four grammars the overlay needs
 * plus one theme. This keeps the dev-only chunk small and avoids a WASM fetch on
 * the dev critical path.
 */
async function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async (): Promise<HighlighterCore> => {
      const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] =
        await Promise.all([
          import('shiki/core'),
          import('shiki/engine/javascript'),
        ])
      const [tsx, ts, js, rust, theme] = await Promise.all([
        import('@shikijs/langs/tsx'),
        import('@shikijs/langs/typescript'),
        import('@shikijs/langs/javascript'),
        import('@shikijs/langs/rust'),
        import('@shikijs/themes/github-dark'),
      ])
      return createHighlighterCore({
        themes: [theme.default],
        langs: [tsx.default, ts.default, js.default, rust.default],
        engine: createJavaScriptRegexEngine(),
      })
    })()
  }
  return highlighterPromise
}

/**
 * Eagerly kick off the heavy, dev-only imports (Shiki core + engine + grammars,
 * trace-mapping, hast-util-to-html) so the first error's source excerpt renders
 * without waiting on library loading. Safe to call repeatedly — the imports are
 * cached. Call it when the overlay host mounts.
 */
export function warmDevErrorSource(): void {
  void getHighlighter()
  void import('@jridgewell/trace-mapping')
  void import('hast-util-to-html')
}

/**
 * Syntax-highlight a source excerpt (Shiki picks the grammar from the file
 * extension, e.g. `.tsx` or `.rs`). Returns `null` if the dev-only libraries
 * fail to load — the caller keeps showing the plain excerpt.
 */
export async function highlightExcerpt(
  src: RawExcerptSource,
): Promise<SourceExcerpt | null> {
  try {
    const [highlighter, htmlModule] = await Promise.all([
      getHighlighter(),
      import('hast-util-to-html'),
    ])
    const toHtml = htmlModule.toHtml as unknown as ToHtml
    return buildExcerpt(
      highlighter,
      toHtml,
      src.content,
      src.file,
      src.line,
      src.column,
    )
  } catch {
    return null
  }
}

/**
 * Resolve stack frames to original locations (via each module's sourcemap) and
 * return the raw source content of the top application frame — WITHOUT
 * highlighting it, so the caller can render a plain excerpt immediately and
 * highlight it asynchronously. Falls back to unmapped frames if trace-mapping
 * fails to load.
 */
export async function resolveDevErrorFrames(
  stack: string | undefined,
): Promise<{ frames: Array<ResolvedFrame>; source: RawExcerptSource | null }> {
  const rawFrames = parseStack(stack)

  try {
    const { TraceMap, originalPositionFor, sourceContentFor } =
      await import('@jridgewell/trace-mapping')

    const mapCache = new Map<string, TraceMap | null>()
    const frames: Array<ResolvedFrame> = []
    let source: RawExcerptSource | null = null

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

      // Keep the top application frame's source for the excerpt.
      if (!source && isApp && content) {
        source = { content, file, line, column }
      }
    }

    return { frames, source }
  } catch {
    return { frames: initialFrames(stack), source: null }
  }
}
