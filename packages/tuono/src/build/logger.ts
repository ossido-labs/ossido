import { type Logger, type LogLevel } from 'vite'

/**
 * `[FE]`-tagged logging for the frontend build/dev tooling (vite, the SSR
 * bundler), matching the Rust `[FE]` format so all Tuono logs read the same:
 * `[FE] LEVEL HH:MM:SS - message`. The `[FE]` tag is cyan; the level is coloured
 * by severity.
 */

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const CYAN = '\x1b[36m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const GREEN = '\x1b[32m'

/**
 * Colours are disabled when `NO_COLOR` is set to a non-empty value (matching the
 * Rust side / the `NO_COLOR` convention), so `NO_COLOR=1 tuono dev` is plain.
 */
const COLOR_ENABLED =
  typeof process === 'undefined' || !process.env.NO_COLOR

type FeLevel = 'INFO' | 'WARN' | 'ERROR'

function timestamp(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}

/** Wrap `text` in ANSI `code`…`RESET`, unless colours are disabled. */
function paint(code: string, text: string): string {
  return COLOR_ENABLED ? `${code}${text}${RESET}` : text
}

function levelColor(level: FeLevel): string {
  if (level === 'ERROR') return RED
  if (level === 'WARN') return YELLOW
  return GREEN
}

function formatLine(level: FeLevel, message: string): string {
  const tag = paint(`${BOLD}${CYAN}`, '[FE]')
  const lvl = paint(levelColor(level), level.padEnd(5))
  const time = paint(DIM, timestamp())
  return `${tag} ${lvl} ${time} - ${message}`
}

/** Print a single `[FE]`-tagged log line. */
export function feLog(level: FeLevel, message: string): void {
  // eslint-disable-next-line no-console
  console.log(formatLine(level, message))
}

const LEVEL_RANK: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
}

/**
 * A vite {@link Logger} that routes vite's own output through the `[FE]` format,
 * honouring `logLevel` (vite does not pre-filter for a custom logger, so the
 * logger must do it — otherwise info/warn noise leaks even at `'error'`).
 */
export function createTuonoViteLogger(logLevel: LogLevel = 'info'): Logger {
  const threshold = LEVEL_RANK[logLevel] ?? LEVEL_RANK.info
  const logger: Logger = {
    hasWarned: false,
    info: (message) => {
      if (threshold >= LEVEL_RANK.info) feLog('INFO', message)
    },
    warn: (message) => {
      logger.hasWarned = true
      if (threshold >= LEVEL_RANK.warn) feLog('WARN', message)
    },
    warnOnce: (message) => {
      if (threshold >= LEVEL_RANK.warn) feLog('WARN', message)
    },
    error: (message) => {
      logger.hasWarned = true
      if (threshold >= LEVEL_RANK.error) feLog('ERROR', message)
    },
    // Tuono manages its own console; never clear it from under other processes.
    clearScreen: () => undefined,
    hasErrorLogged: () => false,
  }
  return logger
}
