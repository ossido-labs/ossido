import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Route } from '../route'

import { getOrCreateResource } from './resourceCache'

// `getOrCreateResource` only reads `options.hasHandler` off the route.
const routeWithHandler = {
  options: { hasHandler: true },
} as unknown as Route

function mockFetch(status: number, body: unknown): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status }),
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getOrCreateResource', () => {
  it('handles a 308 redirect envelope as a redirect, not an error', async () => {
    // The data endpoint sends a redirect as a 308 whose destination is in the
    // body (no `Location` header) — it must be handled before the ok-check.
    mockFetch(308, {
      data: null,
      info: { redirect_destination: '/pokemons/mewtwo' },
    })

    await expect(
      getOrCreateResource('nav::/pokemons/GOAT', routeWithHandler, {
        pathname: '/pokemons/GOAT',
        searchStr: '',
      }),
    ).resolves.toEqual({ kind: 'redirect', destination: '/pokemons/mewtwo' })
  })

  it('resolves a normal 200 response to data', async () => {
    mockFetch(200, { data: { name: 'pikachu' }, info: {} })

    await expect(
      getOrCreateResource('nav::/pokemons/pikachu', routeWithHandler, {
        pathname: '/pokemons/pikachu',
        searchStr: '',
      }),
    ).resolves.toEqual({ kind: 'data', props: { name: 'pikachu' } })
  })

  it('throws on a genuine error status', async () => {
    mockFetch(500, { data: null, info: {} })

    await expect(
      getOrCreateResource('nav::/boom', routeWithHandler, {
        pathname: '/boom',
        searchStr: '',
      }),
    ).rejects.toThrow(/Failed to load server data/)
  })
})
