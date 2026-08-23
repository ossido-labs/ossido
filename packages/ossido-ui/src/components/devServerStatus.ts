/**
 * Dev-only store for the Rust dev server's status, driven by the
 * `ossido:rust-restarting` / `ossido:rust-ready` HMR events the CLI emits
 * around a backend rebuild. The dev indicator (FAB) subscribes to render a
 * "restarting" state, plus a transient notice bubble (e.g. full-reload
 * forensics).
 *
 * Module singleton with the same `useSyncExternalStore` contract as
 * `devErrorStore`.
 */

export type DevServerPhase = 'ready' | 'restarting';

export interface DevServerStatusState {
  phase: DevServerPhase;
  /** Transient message shown in a small bubble by the indicator. */
  notice: string | null;
}

type Listener = () => void;

const NOTICE_TTL_MS = 6000;

const SERVER_SNAPSHOT: DevServerStatusState = { phase: 'ready', notice: null };

class DevServerStatusStore {
  private state: DevServerStatusState = { phase: 'ready', notice: null };
  private listeners = new Set<Listener>();
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): DevServerStatusState => this.state;

  getServerSnapshot = (): DevServerStatusState => SERVER_SNAPSHOT;

  /** The backend is rebuilding (a `.rs` file changed). */
  setRestarting = (): void => {
    if (this.state.phase === 'restarting') return;
    this.state = { ...this.state, phase: 'restarting' };
    this.commit();
  };

  /** The rebuilt backend is accepting connections again. */
  setReady = (): void => {
    if (this.state.phase === 'ready') return;
    this.state = { ...this.state, phase: 'ready' };
    this.commit();
  };

  /** Show a transient notice bubble next to the indicator. */
  showNotice = (message: string): void => {
    this.state = { ...this.state, notice: message };
    this.commit();
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => {
      this.noticeTimer = null;
      this.state = { ...this.state, notice: null };
      this.commit();
    }, NOTICE_TTL_MS);
  };

  dismissNotice = (): void => {
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer);
      this.noticeTimer = null;
    }
    if (this.state.notice === null) return;
    this.state = { ...this.state, notice: null };
    this.commit();
  };

  private commit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const devServerStatus = new DevServerStatusStore();
