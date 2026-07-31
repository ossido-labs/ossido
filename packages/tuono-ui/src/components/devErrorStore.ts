/**
 * Development-only store that aggregates every kind of dev error behind one
 * overlay: React render errors (and SSR/Rust panics) caught by the route error
 * boundary, uncaught `window` errors, unhandled promise rejections, and Vite
 * build/compile errors. {@link DevErrorOverlayHost} subscribes to it via
 * `useSyncExternalStore` and renders a persistent dev indicator + browsable
 * error overlay.
 *
 * The store is a module singleton (not React state) so it exists before the
 * overlay mounts and independently of which subtree threw. It is also published
 * on `window.__TUONO_DEV_ERRORS__` so the Vite HMR client — patched by
 * `ErrorOverlayVitePlugin`, which runs outside the module system — can report
 * build errors into it without needing `import.meta.hot`.
 */

/** The distinct sources an aggregated error can come from. */
export type DevErrorKind =
  | 'runtime'
  | 'uncaught'
  | 'unhandledrejection'
  | 'build'

/**
 * A Vite build/compile error (a subset of Vite's `ErrorPayload['err']`). Kept
 * structural rather than importing from `vite` so this module carries no build
 * dependency.
 */
export interface DevBuildError {
  message: string
  stack?: string
  id?: string
  frame?: string
  plugin?: string
  loc?: { file?: string; line?: number; column?: number }
}

export interface DevErrorEntry {
  id: number
  kind: DevErrorKind
  /** Present for JS errors (`runtime` / `uncaught` / `unhandledrejection`). */
  error?: Error
  /** Present for `build` errors. */
  build?: DevBuildError
  /** Only in-place-resettable errors (the route boundary) carry a reset. */
  reset?: () => void
  /** How many times this identical error has been reported (dedup counter). */
  occurrences: number
  /** Dedup key — identical errors collapse to a single entry. */
  signature: string
}

/** Which screen corner the dev indicator sits in. */
export type DevOverlayCorner =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export const DEV_OVERLAY_CORNERS: ReadonlyArray<DevOverlayCorner> = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]

export interface DevErrorState {
  entries: ReadonlyArray<DevErrorEntry>
  /** Index of the entry currently shown in the pager. */
  activeIndex: number
  /** The full error overlay is open (only meaningful when there are errors). */
  overlayOpen: boolean
  /** The indicator's menu popover is open. */
  menuOpen: boolean
  /** The user hid the idle indicator for this session (errors still force it). */
  badgeHidden: boolean
  /** Which corner the indicator sits in (persisted across reloads). */
  position: DevOverlayCorner
}

const DEFAULT_CORNER: DevOverlayCorner = 'bottom-left'
const CORNER_STORAGE_KEY = 'tuono:dev-overlay-corner'

/** The corner is a persisted preference; hiding the badge is per-session. */
function loadCorner(): DevOverlayCorner {
  try {
    const stored = globalThis.localStorage?.getItem(CORNER_STORAGE_KEY)
    if (stored && (DEV_OVERLAY_CORNERS as ReadonlyArray<string>).includes(stored))
      return stored as DevOverlayCorner
  } catch {
    // localStorage can be unavailable (SSR, privacy mode) — use the default.
  }
  return DEFAULT_CORNER
}

function saveCorner(corner: DevOverlayCorner): void {
  try {
    globalThis.localStorage?.setItem(CORNER_STORAGE_KEY, corner)
  } catch {
    // Best-effort — a failed write just means the corner isn't remembered.
  }
}

const EMPTY_STATE: DevErrorState = {
  entries: [],
  activeIndex: 0,
  overlayOpen: false,
  menuOpen: false,
  badgeHidden: false,
  position: DEFAULT_CORNER,
}

const BRIDGE_KEY = '__TUONO_DEV_ERRORS__'
const BUFFER_KEY = '__TUONO_DEV_ERRORS_BUFFER__'

// Deliberately kind-agnostic: React rethrows a caught render error to
// `window.onerror` in dev, so the same error arrives as both `runtime` (from the
// boundary) and `uncaught`. Keying on the error identity collapses them into one
// entry (upgraded to `runtime` so it keeps a working "Try again").
function jsSignature(error: Error): string {
  return `${error.name}:${error.message}:${(error.stack ?? '').slice(0, 200)}`
}

// Build errors replace one another (Vite reports the latest), so they share a
// single signature — a new build error overwrites the previous one.
const BUILD_SIGNATURE = 'build'

class DevErrorStore {
  private entries: Array<DevErrorEntry> = []
  private activeIndex = 0
  private overlayOpen = false
  private menuOpen = false
  private badgeHidden = false
  private position: DevOverlayCorner = loadCorner()
  private nextId = 1
  private listeners = new Set<() => void>()
  // Cached immutable snapshot for `useSyncExternalStore` referential stability.
  private snapshot: DevErrorState = EMPTY_STATE

  constructor() {
    // Build the initial snapshot from the loaded fields (notably the persisted
    // corner) so the first render already reflects it.
    this.commit()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return (): void => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): DevErrorState => this.snapshot

  getServerSnapshot = (): DevErrorState => EMPTY_STATE

  private commit(): void {
    this.activeIndex = Math.min(
      Math.max(this.activeIndex, 0),
      Math.max(this.entries.length - 1, 0),
    )
    this.snapshot = {
      entries: this.entries.slice(),
      activeIndex: this.activeIndex,
      // The overlay is only meaningful when there is something to show.
      overlayOpen: this.overlayOpen && this.entries.length > 0,
      menuOpen: this.menuOpen,
      badgeHidden: this.badgeHidden,
      position: this.position,
    }
    for (const listener of this.listeners) listener()
  }

  /** Add (or refresh) a JS error. Returns its id so the reporter can remove it. */
  addJsError = (
    kind: Exclude<DevErrorKind, 'build'>,
    error: Error,
    reset?: () => void,
  ): number => {
    const signature = jsSignature(error)
    const existing = this.entries.find((e) => e.signature === signature)
    if (existing) {
      // A `runtime` report (from the boundary) carries a reset and is the
      // richer representation — let it win over a bare `uncaught` duplicate.
      if (kind === 'runtime') {
        existing.kind = 'runtime'
        existing.reset = reset ?? existing.reset
      }
      // Identical errors dedupe (so a re-render loop can't flood the pager), but
      // a recurrence still counts and re-opens the overlay.
      existing.occurrences += 1
      this.activeIndex = this.entries.indexOf(existing)
      this.overlayOpen = true
      this.commit()
      return existing.id
    }
    const entry: DevErrorEntry = {
      id: this.nextId++,
      kind,
      error,
      reset,
      occurrences: 1,
      signature,
    }
    this.entries.push(entry)
    this.activeIndex = this.entries.length - 1
    // A genuinely new error opens the overlay.
    this.overlayOpen = true
    this.commit()
    return entry.id
  }

  /** Report a Vite build error — replaces any previous one. */
  addBuildError = (build: DevBuildError): number => {
    this.entries = this.entries.filter((e) => e.kind !== 'build')
    const entry: DevErrorEntry = {
      id: this.nextId++,
      kind: 'build',
      build,
      occurrences: 1,
      signature: BUILD_SIGNATURE,
    }
    this.entries.push(entry)
    this.activeIndex = this.entries.length - 1
    this.overlayOpen = true
    this.commit()
    return entry.id
  }

  /** Clear the current build error (called when Vite reports a successful update). */
  clearBuildErrors = (): void => {
    if (!this.entries.some((e) => e.kind === 'build')) return
    this.entries = this.entries.filter((e) => e.kind !== 'build')
    this.commit()
  }

  removeById = (id: number): void => {
    const next = this.entries.filter((e) => e.id !== id)
    if (next.length === this.entries.length) return
    this.entries = next
    this.commit()
  }

  setActiveIndex = (index: number): void => {
    this.activeIndex = index
    this.commit()
  }

  next = (): void => {
    if (this.entries.length === 0) return
    this.activeIndex = (this.activeIndex + 1) % this.entries.length
    this.commit()
  }

  prev = (): void => {
    if (this.entries.length === 0) return
    this.activeIndex =
      (this.activeIndex - 1 + this.entries.length) % this.entries.length
    this.commit()
  }

  /** Open the full error overlay (from the indicator menu's "View errors"). */
  openOverlay = (): void => {
    this.overlayOpen = true
    this.menuOpen = false
    this.commit()
  }

  /** Close the overlay back to the indicator (X / Esc / click-away). */
  closeOverlay = (): void => {
    this.overlayOpen = false
    this.commit()
  }

  toggleMenu = (): void => {
    this.menuOpen = !this.menuOpen
    this.commit()
  }

  closeMenu = (): void => {
    if (!this.menuOpen) return
    this.menuOpen = false
    this.commit()
  }

  /** Hide the idle indicator for this session (a new error still forces it back). */
  hideBadge = (): void => {
    this.badgeHidden = true
    this.menuOpen = false
    this.commit()
  }

  setPosition = (corner: DevOverlayCorner): void => {
    this.position = corner
    saveCorner(corner)
    this.commit()
  }

  /**
   * Publish the store on `window` and drain any errors buffered by the Vite
   * client before this module loaded. Safe to call repeatedly.
   */
  installBridge(): void {
    if (typeof window === 'undefined') return
    const globalWindow = window as unknown as Record<string, unknown>
    globalWindow[BRIDGE_KEY] = this
    const buffered = globalWindow[BUFFER_KEY] as
      | Array<DevBuildError>
      | undefined
    if (buffered?.length) {
      for (const build of buffered) this.addBuildError(build)
      globalWindow[BUFFER_KEY] = []
    }
  }
}

export const devErrorStore = new DevErrorStore()

// Publish immediately on import (client only) so build errors reported by the
// patched Vite client always have a target.
devErrorStore.installBridge()
