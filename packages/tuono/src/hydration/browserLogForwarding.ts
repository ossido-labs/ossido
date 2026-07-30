/**
 * Dev-only: forward browser `console.*` (and uncaught errors) to the Tuono dev
 * server console, where they are printed tagged `[FE]`. The server applies the
 * `logging.browser` level/enabled config. The original console output is kept
 * intact.
 */

interface ForwardedError {
  name: string
  message: string
  stack: Array<string>
}

interface ForwardedEntry {
  level: string
  message: string
  error?: ForwardedError
}

const CONSOLE_METHODS = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
] as const

const LOGS_ENDPOINT = '/__tuono/logs'
const FLUSH_DELAY_MS = 60
const MAX_FRAMES = 6

function formatArg(arg: unknown): string {
  if (typeof arg === 'string') return arg
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`
  if (arg === undefined) return 'undefined'
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

/** Tidy a browser stack: drop the leading `Name: message` line, trim frames and
 * strip the dev-server origin so paths read like the project source. */
function cleanStack(stack: string | undefined): Array<string> {
  if (!stack) return []
  const origin = typeof location !== 'undefined' ? location.origin : ''
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at ') || line.includes('@'))
    .map((line) =>
      line.replaceAll(`${origin}/`, '').replaceAll('vite-server/', ''),
    )
    .slice(0, MAX_FRAMES)
}

function toEntry(level: string, args: ReadonlyArray<unknown>): ForwardedEntry {
  const message = args.map(formatArg).join(' ')
  const errorArg = args.find((arg): arg is Error => arg instanceof Error)
  const error = errorArg
    ? {
        name: errorArg.name,
        message: errorArg.message,
        stack: cleanStack(errorArg.stack),
      }
    : undefined
  return { level, message, error }
}

let installed = false

export function installBrowserLogForwarding(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  const queue: Array<ForwardedEntry> = []
  let scheduled = false

  const flush = (): void => {
    scheduled = false
    if (queue.length === 0) return
    const body = JSON.stringify(queue.splice(0, queue.length))
    // A typed Blob makes `sendBeacon` post `application/json` (it defaults to
    // `text/plain`). `sendBeacon` is fire-and-forget and survives page unload;
    // fall back to a keepalive fetch when unavailable or when it rejects.
    const blob = new Blob([body], { type: 'application/json' })
    if (!navigator.sendBeacon?.(LOGS_ENDPOINT, blob)) {
      void fetch(LOGS_ENDPOINT, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => undefined)
    }
  }

  const schedule = (): void => {
    if (scheduled) return
    scheduled = true
    setTimeout(flush, FLUSH_DELAY_MS)
  }

  const enqueue = (level: string, args: ReadonlyArray<unknown>): void => {
    try {
      queue.push(toEntry(level, args))
      schedule()
    } catch {
      // Never let forwarding break the console.
    }
  }

  // Curried wrapper: `level -> original console method -> forwarding method`.
  // The wrapped method logs as usual, then forwards the call to the server.
  const withForwarding =
    (level: string) =>
    (original: (...args: Array<unknown>) => void) =>
    (...args: Array<unknown>): void => {
      original(...args)
      enqueue(level, args)
    }

  for (const method of CONSOLE_METHODS) {
    console[method] = withForwarding(method)(console[method].bind(console))
  }

  window.addEventListener('error', (event) => {
    enqueue('error', [event.error ?? event.message])
  })
  window.addEventListener('unhandledrejection', (event) => {
    enqueue('error', [event.reason])
  })
}
