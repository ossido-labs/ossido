/**
 * Dev-only: forward browser `console.*` (and uncaught errors) to the Ossido dev
 * server console, where they are printed tagged `[FE]`. The server applies the
 * `logging.browser` level/enabled config. The original console output is kept
 * intact.
 */

interface ForwardedError {
  name: string;
  message: string;
  stack: Array<string>;
}

interface ForwardedEntry {
  level: string;
  message: string;
  error?: ForwardedError;
  /** A client-side navigation event (rather than a `console.*` call). */
  navigation?: boolean;
  /** For a navigation that loaded data: the data response's HTTP status. */
  status?: number;
  /** For a navigation that loaded data: how long the load took, in ms. */
  durationMs?: number;
}

const CONSOLE_METHODS = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
] as const;

const LOGS_ENDPOINT = '/__ossido/logs';
// A route's server data is loaded from `/__ossido/data{pathname}{searchStr}`, so
// the request URL encodes the navigation path — that's how a data load is
// correlated back to the navigation that triggered it.
const DATA_ROUTE_PREFIX = '/__ossido/data';
const FLUSH_DELAY_MS = 60;
const MAX_FRAMES = 6;
// Cap the in-flight/recent data-load map so an un-consumed entry (e.g. an error
// retry that refetches without navigating) can't grow it without bound.
const MAX_TRACKED_DATA_LOADS = 50;

/** The outcome of a route's data fetch, correlated to a navigation by path. */
interface NavDataLoad {
  status: number;
  durationMs: number;
}

/** Mirror the backend's status→level mapping so a failed data load stands out. */
function levelForStatus(status: number): string {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

function formatArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  if (arg === undefined) return 'undefined';
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

/** Tidy a browser stack: drop the leading `Name: message` line, trim frames and
 * strip the dev-server origin so paths read like the project source. */
function cleanStack(stack: string | undefined): Array<string> {
  if (!stack) return [];
  const origin = typeof location !== 'undefined' ? location.origin : '';
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at ') || line.includes('@'))
    .map((line) =>
      line.replaceAll(`${origin}/`, '').replaceAll('vite-server/', ''),
    )
    .slice(0, MAX_FRAMES);
}

function toEntry(level: string, args: ReadonlyArray<unknown>): ForwardedEntry {
  const message = args.map(formatArg).join(' ');
  const errorArg = args.find((arg): arg is Error => arg instanceof Error);
  const error = errorArg
    ? {
        name: errorArg.name,
        message: errorArg.message,
        stack: cleanStack(errorArg.stack),
      }
    : undefined;
  return { level, message, error };
}

let installed = false;

export function installBrowserLogForwarding(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const queue: Array<ForwardedEntry> = [];
  let scheduled = false;

  const flush = (): void => {
    scheduled = false;
    if (queue.length === 0) return;
    const body = JSON.stringify(queue.splice(0, queue.length));
    // A typed Blob makes `sendBeacon` post `application/json` (it defaults to
    // `text/plain`). `sendBeacon` is fire-and-forget and survives page unload;
    // fall back to a keepalive fetch when unavailable or when it rejects.
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.(LOGS_ENDPOINT, blob)) {
      void fetch(LOGS_ENDPOINT, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => undefined);
    }
  };

  const schedule = (): void => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(flush, FLUSH_DELAY_MS);
  };

  const enqueue = (level: string, args: ReadonlyArray<unknown>): void => {
    try {
      queue.push(toEntry(level, args));
      schedule();
    } catch {
      // Never let forwarding break the console.
    }
  };

  // Curried wrapper: `level -> original console method -> forwarding method`.
  // The wrapped method logs as usual, then forwards the call to the server.
  const withForwarding =
    (level: string) =>
    (original: (...args: Array<unknown>) => void) =>
    (...args: Array<unknown>): void => {
      original(...args);
      enqueue(level, args);
    };

  for (const method of CONSOLE_METHODS) {
    console[method] = withForwarding(method)(console[method].bind(console));
  }

  window.addEventListener('error', (event) => {
    enqueue('error', [event.error ?? event.message]);
  });
  window.addEventListener('unhandledrejection', (event) => {
    enqueue('error', [event.reason]);
  });

  // Observe route data loads so a navigation's log line can carry the load's
  // status + duration (mirroring the backend request log). Keyed by the
  // navigation path — the `/__ossido/data{path}` URL encodes it — and consumed by
  // the matching navigation report.
  const dataLoads = new Map<string, Promise<NavDataLoad | null>>();
  const originalFetch =
    typeof window.fetch === 'function' ? window.fetch.bind(window) : undefined;
  if (originalFetch) {
    window.fetch = (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const request = originalFetch(input, init);
      try {
        const raw =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        const { pathname, search } = new URL(raw, location.origin);
        if (pathname.startsWith(DATA_ROUTE_PREFIX)) {
          // Strip the prefix to recover the navigation path (`pathname+search`).
          const navPath =
            pathname.slice(DATA_ROUTE_PREFIX.length) + search || '/';
          const start = performance.now();
          if (dataLoads.size >= MAX_TRACKED_DATA_LOADS) {
            const oldest = dataLoads.keys().next().value;
            if (oldest !== undefined) dataLoads.delete(oldest);
          }
          dataLoads.set(
            navPath,
            request.then(
              (res) => ({
                status: res.status,
                durationMs: performance.now() - start,
              }),
              () => null,
            ),
          );
        }
      } catch {
        // Correlation is best-effort; never let it interfere with the fetch.
      }
      return request;
    };
  }

  // Report client-side navigations so the dev server logs them too. The router
  // commits every navigation via history.pushState/replaceState; back/forward
  // fire popstate. (The initial load is a normal request the server already
  // logs, and does not go through these.)
  const emitNavigation = async (): Promise<void> => {
    try {
      const path = window.location.pathname + window.location.search;
      const load = dataLoads.get(path);
      dataLoads.delete(path);
      const timing = load ? await load : null;
      queue.push(
        timing
          ? {
              level: levelForStatus(timing.status),
              message: path,
              navigation: true,
              status: timing.status,
              durationMs: timing.durationMs,
            }
          : { level: 'info', message: path, navigation: true },
      );
      schedule();
    } catch {
      // Never let reporting break navigation.
    }
  };

  // Defer via a microtask so the router's own popstate handler (which starts the
  // data fetch) has run before we correlate — the fetch is then already tracked.
  const reportNavigation = (): void => {
    queueMicrotask(() => {
      void emitNavigation();
    });
  };

  const patchHistory = (method: 'pushState' | 'replaceState'): void => {
    const original = history[method].bind(history);
    history[method] = (...args: Parameters<History['pushState']>): void => {
      original(...args);
      reportNavigation();
    };
  };
  patchHistory('pushState');
  patchHistory('replaceState');
  window.addEventListener('popstate', reportNavigation);
}
