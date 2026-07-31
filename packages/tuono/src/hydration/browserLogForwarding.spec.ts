import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `browserLogForwarding` targets the browser, so these tests stub the handful of
 * globals it touches (`window`/`navigator`/`location`) on top of node's built-in
 * `Blob`/`fetch`/`setTimeout`. The module keeps a one-shot `installed` guard, so
 * each test re-imports it fresh via `vi.resetModules()`.
 *
 * The wrapper captures each `console[method]` *at install time* and delegates to
 * it, so every test silences (spies) the console method **before** installing —
 * that silenced spy becomes the delegate, and `console[method]` afterwards is the
 * forwarding wrapper.
 */

interface ForwardedEntry {
  level: string
  message: string
  error?: { name: string; message: string; stack: Array<string> }
  navigation?: boolean
}

type EventHandler = (event: unknown) => void

const FLUSH_DELAY_MS = 60

let sendBeacon: ReturnType<typeof vi.fn>
let eventHandlers: Record<string, EventHandler>
let currentLocation: { origin: string; pathname: string; search: string }

/** Read the JSON batch handed to the most recent `sendBeacon` call. */
async function lastBeaconBatch(): Promise<Array<ForwardedEntry>> {
  const calls = sendBeacon.mock.calls
  const blob = calls[calls.length - 1]?.[1] as Blob
  return JSON.parse(await blob.text()) as Array<ForwardedEntry>
}

async function install(): Promise<void> {
  const mod = await import('./browserLogForwarding')
  mod.installBrowserLogForwarding()
}

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()

  sendBeacon = vi.fn(() => true)
  eventHandlers = {}
  currentLocation = { origin: 'http://localhost:3000', pathname: '/', search: '' }

  vi.stubGlobal('navigator', { sendBeacon })
  vi.stubGlobal('location', currentLocation)
  vi.stubGlobal('history', {
    pushState: (): void => undefined,
    replaceState: (): void => undefined,
  })
  vi.stubGlobal('window', {
    location: currentLocation,
    addEventListener: (type: string, handler: EventHandler) => {
      eventHandlers[type] = handler
    },
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('installBrowserLogForwarding', () => {
  it('forwards a console call as a batched beacon while keeping the original output', async () => {
    const original = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined)
    await install()

    console.log('hello', 123)
    vi.advanceTimersByTime(FLUSH_DELAY_MS)

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    const [endpoint, blob] = sendBeacon.mock.calls[0] as [string, Blob]
    expect(endpoint).toBe('/__tuono/logs')
    expect(blob.type).toBe('application/json')

    const batch = await lastBeaconBatch()
    expect(batch).toEqual([{ level: 'log', message: 'hello 123' }])
    // The original console method still ran with the untouched arguments.
    expect(original).toHaveBeenCalledWith('hello', 123)
  })

  it('batches multiple calls in one flush window into a single beacon', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await install()

    console.info('first')
    console.warn('second')
    vi.advanceTimersByTime(FLUSH_DELAY_MS)

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    const batch = await lastBeaconBatch()
    expect(batch.map((entry) => entry.level)).toEqual(['info', 'warn'])
  })

  it('extracts a forwarded Error into name/message/stack', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await install()

    console.error(new Error('kaboom'))
    vi.advanceTimersByTime(FLUSH_DELAY_MS)

    const [entry] = await lastBeaconBatch()
    expect(entry?.level).toBe('error')
    expect(entry?.error?.name).toBe('Error')
    expect(entry?.error?.message).toBe('kaboom')
    expect(Array.isArray(entry?.error?.stack)).toBe(true)
  })

  it('falls back to a keepalive fetch when sendBeacon reports failure', async () => {
    sendBeacon.mockReturnValue(false)
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null))
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await install()

    console.log('over the fallback')
    vi.advanceTimersByTime(FLUSH_DELAY_MS)

    expect(fetchSpy).toHaveBeenCalledWith(
      '/__tuono/logs',
      expect.objectContaining({ method: 'POST', keepalive: true }),
    )
  })

  it('forwards uncaught errors and unhandled rejections', async () => {
    await install()

    eventHandlers.error?.({ error: new Error('uncaught') })
    eventHandlers.unhandledrejection?.({ reason: 'rejected' })
    vi.advanceTimersByTime(FLUSH_DELAY_MS)

    const batch = await lastBeaconBatch()
    expect(batch).toHaveLength(2)
    expect(batch[0]?.error?.message).toBe('uncaught')
    expect(batch[1]?.message).toBe('rejected')
  })

  it('installs only once, so a call is forwarded a single time', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await install()
    await install() // second call must be a no-op

    console.log('once')
    vi.advanceTimersByTime(FLUSH_DELAY_MS)

    const batch = await lastBeaconBatch()
    expect(batch).toHaveLength(1)
  })

  it('reports a client-side navigation via history.pushState', async () => {
    await install()

    currentLocation.pathname = '/pokemons/pikachu'
    history.pushState({}, '', '/pokemons/pikachu')
    vi.advanceTimersByTime(FLUSH_DELAY_MS)

    const batch = await lastBeaconBatch()
    expect(batch).toEqual([
      { level: 'info', message: '/pokemons/pikachu', navigation: true },
    ])
  })

  it('reports back/forward navigation via popstate', async () => {
    await install()

    currentLocation.pathname = '/pokemons'
    currentLocation.search = '?page=2'
    eventHandlers.popstate?.(new Event('popstate'))
    vi.advanceTimersByTime(FLUSH_DELAY_MS)

    const [entry] = await lastBeaconBatch()
    expect(entry).toMatchObject({ navigation: true, message: '/pokemons?page=2' })
  })
})
