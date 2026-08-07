import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DevBuildError, devErrorStore } from './devErrorStore'

/**
 * The store is a module singleton, so each test imports a fresh copy via
 * `vi.resetModules()` to avoid state bleeding between cases.
 */
type Store = typeof devErrorStore

async function freshStore(): Promise<Store> {
  vi.resetModules()
  const mod = await import('./devErrorStore')
  return mod.devErrorStore
}

function jsError(message: string): Error {
  const error = new Error(message)
  error.stack = `Error: ${message}\n    at foo (app.tsx:1:1)`
  return error
}

const buildError: DevBuildError = {
  message: 'Expression expected',
  frame: '15 | const x = ;\n   |           ^',
  loc: { file: 'src/routes/page.tsx', line: 15, column: 11 },
}

beforeEach(() => {
  const w = window as unknown as Record<string, unknown>
  delete w['__OSSIDO_DEV_ERRORS__']
  delete w['__OSSIDO_DEV_ERRORS_BUFFER__']
  globalThis.localStorage?.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('devErrorStore', () => {
  it('adds a JS error and points the pager at it', async () => {
    const store = await freshStore()
    store.addJsError('runtime', jsError('boom'))

    const state = store.getSnapshot()
    expect(state.entries).toHaveLength(1)
    expect(state.entries[0]?.kind).toBe('runtime')
    expect(state.activeIndex).toBe(0)
    // A new error auto-opens the overlay.
    expect(state.overlayOpen).toBe(true)
  })

  it('dedups an identical error to one entry and counts its occurrences', async () => {
    const store = await freshStore()
    const error = jsError('same')
    const first = store.addJsError('runtime', error)
    const second = store.addJsError('runtime', error)

    expect(first).toBe(second)
    const state = store.getSnapshot()
    expect(state.entries).toHaveLength(1)
    expect(state.entries[0]?.occurrences).toBe(2)
  })

  it('re-opens the overlay when a repeated error recurs', async () => {
    const store = await freshStore()
    const error = jsError('again')
    store.addJsError('uncaught', error)
    store.closeOverlay()
    expect(store.getSnapshot().overlayOpen).toBe(false)

    // Triggering the same error again bumps the count and re-opens the overlay.
    store.addJsError('uncaught', error)
    const state = store.getSnapshot()
    expect(state.entries).toHaveLength(1)
    expect(state.entries[0]?.occurrences).toBe(2)
    expect(state.overlayOpen).toBe(true)
  })

  it('collapses the same error reported as uncaught then runtime into one entry', async () => {
    const store = await freshStore()
    const error = jsError('dup')
    store.addJsError('uncaught', error)
    const reset = vi.fn()
    store.addJsError('runtime', error, reset)

    const state = store.getSnapshot()
    expect(state.entries).toHaveLength(1)
    // The runtime report wins: it carries a working "Try again".
    expect(state.entries[0]?.kind).toBe('runtime')
    expect(state.entries[0]?.reset).toBe(reset)
  })

  it('appends a distinct error and re-opens the overlay', async () => {
    const store = await freshStore()
    store.addJsError('runtime', jsError('one'))
    store.closeOverlay()
    expect(store.getSnapshot().overlayOpen).toBe(false)

    store.addJsError('uncaught', jsError('two'))
    const state = store.getSnapshot()
    expect(state.entries).toHaveLength(2)
    expect(state.overlayOpen).toBe(true)
    expect(state.activeIndex).toBe(1)
  })

  it('replaces the previous build error rather than stacking them', async () => {
    const store = await freshStore()
    store.addBuildError(buildError)
    store.addBuildError({ ...buildError, message: 'Unexpected token' })

    const builds = store.getSnapshot().entries.filter((e) => e.kind === 'build')
    expect(builds).toHaveLength(1)
    expect(builds[0]?.build?.message).toBe('Unexpected token')
  })

  it('clears build errors while keeping JS errors', async () => {
    const store = await freshStore()
    store.addJsError('runtime', jsError('js'))
    store.addBuildError(buildError)
    expect(store.getSnapshot().entries).toHaveLength(2)

    store.clearBuildErrors()
    const state = store.getSnapshot()
    expect(state.entries).toHaveLength(1)
    expect(state.entries[0]?.kind).toBe('runtime')
  })

  it('removes an entry by id', async () => {
    const store = await freshStore()
    const id = store.addJsError('runtime', jsError('gone'))
    store.removeById(id)
    expect(store.getSnapshot().entries).toHaveLength(0)
  })

  it('pages forward and backward with wraparound', async () => {
    const store = await freshStore()
    store.addJsError('runtime', jsError('a'))
    store.addJsError('uncaught', jsError('b'))
    expect(store.getSnapshot().activeIndex).toBe(1)

    store.next()
    expect(store.getSnapshot().activeIndex).toBe(0)
    store.prev()
    expect(store.getSnapshot().activeIndex).toBe(1)
  })

  it('reports the overlay open only while there are errors', async () => {
    const store = await freshStore()
    store.openOverlay()
    // No entries → the overlay can't be open.
    expect(store.getSnapshot().overlayOpen).toBe(false)

    store.addJsError('runtime', jsError('x'))
    expect(store.getSnapshot().overlayOpen).toBe(true)
    store.closeOverlay()
    expect(store.getSnapshot().overlayOpen).toBe(false)
  })

  it('toggles the menu, and hiding the badge closes the menu', async () => {
    const store = await freshStore()
    expect(store.getSnapshot().menuOpen).toBe(false)

    store.toggleMenu()
    expect(store.getSnapshot().menuOpen).toBe(true)

    store.hideBadge()
    const state = store.getSnapshot()
    expect(state.menuOpen).toBe(false)
    expect(state.badgeHidden).toBe(true)
  })

  it('defaults the corner to bottom-left and persists a change', async () => {
    const store = await freshStore()
    expect(store.getSnapshot().position).toBe('bottom-left')

    store.setPosition('top-right')
    expect(store.getSnapshot().position).toBe('top-right')
    expect(globalThis.localStorage?.getItem('ossido:dev-overlay-corner')).toBe(
      'top-right',
    )
  })

  it('loads the persisted corner on init', async () => {
    globalThis.localStorage?.setItem('ossido:dev-overlay-corner', 'top-left')
    const store = await freshStore()
    expect(store.getSnapshot().position).toBe('top-left')
  })

  it('notifies subscribers and swaps the snapshot reference on change', async () => {
    const store = await freshStore()
    const listener = vi.fn()
    const before = store.getSnapshot()

    const unsubscribe = store.subscribe(listener)
    store.addJsError('runtime', jsError('notify'))

    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).not.toBe(before)

    unsubscribe()
    store.addJsError('uncaught', jsError('after'))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('drains build errors buffered before the store loaded', async () => {
    const w = window as unknown as Record<string, unknown>
    w['__OSSIDO_DEV_ERRORS_BUFFER__'] = [buildError]

    const store = await freshStore()
    // installBridge (run on import) drains the buffer into the store.
    const state = store.getSnapshot()
    expect(state.entries).toHaveLength(1)
    expect(state.entries[0]?.kind).toBe('build')
    expect(w['__OSSIDO_DEV_ERRORS__']).toBe(store)
  })
})
