/**
 * Dev-only HMR hooks, called from the generated client entry
 * (`.ossido/client-main.tsx`) — the only place `import.meta.hot` is available
 * (Vite provides a hot context to transformed project modules, not to
 * pre-bundled dependencies). The entry stays a dumb forwarder; the behaviour
 * lives here:
 *
 * - `ossido:rust-restarting` / `ossido:rust-ready` — emitted by `ossido dev`
 *   around a Rust server rebuild (any `.rs` edit). Restarting shows a pulsing
 *   dev indicator; ready re-fetches the current route's server props in place,
 *   so a `page.rs` / `layout.rs` edit updates the page without a reload.
 * - `vite:beforeFullReload` — full-reload forensics: the culprit is recorded
 *   to `sessionStorage` and surfaced after the reload, so a hard refresh is
 *   always attributable.
 */

import { requestPropsRefetch } from '@ossido-labs/ossido-router';
import { devServerStatus } from '@ossido-labs/ossido-ui';

const FULL_RELOAD_KEY = 'ossido:last-full-reload';

/** The backend is rebuilding (a `.rs` file changed). */
export function __ossido__internal__devServerRestarting(): void {
  devServerStatus.setRestarting();
}

/** The rebuilt backend is up: refresh the current route's props in place. */
export function __ossido__internal__devServerReady(): void {
  devServerStatus.setReady();
  requestPropsRefetch();
}

/** Record the imminent full reload's cause for post-reload forensics. */
export function __ossido__internal__recordFullReload(payload?: {
  path?: string;
  triggeredBy?: string;
}): void {
  try {
    const cause = payload?.triggeredBy ?? payload?.path ?? 'unknown';
    sessionStorage.setItem(
      FULL_RELOAD_KEY,
      JSON.stringify({ cause, at: Date.now() }),
    );
  } catch {
    // Storage unavailable (rare) — forensics are best-effort.
  }
}

/**
 * If the previous page load was a dev full reload, surface its cause (console
 * + indicator notice). Called once from `hydrate()` in dev.
 */
export function reportPendingFullReload(): void {
  let cause: string | null = null;
  try {
    const raw = sessionStorage.getItem(FULL_RELOAD_KEY);
    if (!raw) return;
    sessionStorage.removeItem(FULL_RELOAD_KEY);
    cause = (JSON.parse(raw) as { cause?: string }).cause ?? 'unknown';
  } catch {
    return;
  }
  // eslint-disable-next-line no-console
  console.warn(
    `[ossido] The previous full page reload was caused by: ${cause}`,
  );
  devServerStatus.showNotice(`Full reload caused by: ${cause}`);
}
