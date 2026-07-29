import type { Route } from '../route'
import type { ServerErrorPayload, TuonoErrorWithSource } from '../types'

const isServerSide = typeof window === 'undefined'

/**
 * Fulfilled value of a data resource. A redirect is a normal (non-error)
 * outcome so it must NOT reject — rejecting would trigger the error boundary.
 */
export type RouteDataResult =
  | { kind: 'data'; props: Record<string, unknown> }
  | { kind: 'redirect'; destination: string }

/**
 * A promise annotated with `status`/`value`/`reason` so React's `use()` reads
 * settled resources synchronously (no suspend). This is what lets the SSR and
 * hydration first render resolve pre-seeded data without suspending.
 */
export interface DataResource extends Promise<RouteDataResult> {
  status: 'pending' | 'fulfilled' | 'rejected'
  value?: RouteDataResult
  reason?: unknown
}

interface LocationKeyParts {
  pathname: string
  searchStr: string
}

interface TuonoApiResponse {
  data?: unknown
  info: {
    redirect_destination?: string
    // Present (dev only) when the Rust handler panicked — see `error_json` in
    // crates/tuono_lib/src/response.rs.
    serverError?: ServerErrorPayload
  }
}

/**
 * Rebuild a `ServerErrorPayload` (from the Rust server) into a real `Error` so
 * the error boundary / dev overlay treats a backend panic exactly like a JS
 * error, preserving the panic message and backtrace.
 */
export function serverErrorToError(payload: ServerErrorPayload): Error {
  const error: TuonoErrorWithSource = new Error(payload.message)
  error.name = payload.name
  if (payload.stack) error.stack = payload.stack
  // Carry the panic-site source through to the overlay for a highlighted
  // excerpt (Rust has no sourcemap the client could resolve one from).
  if (payload.source) error.tuonoServerSource = payload.source
  return error
}

const CACHE_LIMIT = 50
const cache = new Map<string, DataResource>()

/**
 * Single source of truth for a resource key — used by both the seeder and the
 * loader. Includes `searchStr` so search-param-only navigations create a
 * distinct resource (and therefore refetch).
 */
export function buildResourceKey(
  navigationId: number,
  { pathname, searchStr }: LocationKeyParts,
): string {
  return `${navigationId}::${pathname}${searchStr}`
}

/** Normalize user server data into a `data` result for seeding. */
export function toDataResult(props: unknown): RouteDataResult {
  return { kind: 'data', props: (props ?? {}) as Record<string, unknown> }
}

function annotate(promise: Promise<RouteDataResult>): DataResource {
  const resource = promise as DataResource
  resource.status = 'pending'
  resource.then(
    (value) => {
      resource.status = 'fulfilled'
      resource.value = value
    },
    (reason) => {
      resource.status = 'rejected'
      resource.reason = reason
    },
  )
  return resource
}

async function fetchRouteData(
  location: LocationKeyParts,
): Promise<RouteDataResult> {
  const res = await fetch(
    `/__tuono/data${location.pathname}${location.searchStr}`,
  )
  // Read the body before the `res.ok` check: a panicked handler responds with a
  // 500 that still carries the structured error under `info.serverError` (dev).
  const body = (await res.json().catch(() => null)) as TuonoApiResponse | null

  if (body?.info.serverError) {
    throw serverErrorToError(body.info.serverError)
  }
  if (!res.ok || !body) {
    throw new Error(
      `Failed to load server data for "${location.pathname}" (status ${res.status})`,
    )
  }
  if (body.info.redirect_destination) {
    return { kind: 'redirect', destination: body.info.redirect_destination }
  }
  return toDataResult(body.data)
}

/**
 * Insert a pre-fulfilled resource — used to seed the SSR initial data so the
 * first render (server and client) reads it synchronously.
 */
export function seedResource(
  key: string,
  value: RouteDataResult,
): DataResource {
  const resource = Promise.resolve(value) as DataResource
  resource.status = 'fulfilled'
  resource.value = value
  cache.set(key, resource)
  return resource
}

/**
 * Insert a pre-rejected resource carrying a server error — used to seed a
 * handler panic (dev) so `use()` re-throws it into the error boundary on the
 * first render (server and client), rendering the error overlay.
 */
export function seedErrorResource(
  key: string,
  payload: ServerErrorPayload,
): DataResource {
  const reason = serverErrorToError(payload)
  const resource = Promise.reject(reason) as DataResource
  // The rejection is consumed synchronously by `use()`, but attach a no-op
  // catch so it is never reported as an unhandled rejection.
  resource.catch(() => undefined)
  resource.status = 'rejected'
  resource.reason = reason
  cache.set(key, resource)
  return resource
}

/**
 * Return the cached resource for `key`, creating one on demand. Idempotent
 * (StrictMode-safe): at most one fetch is started per key.
 *
 * The server never fetches (the ssr_rs V8 runtime has no `fetch`); every
 * server-rendered route is pre-seeded, and any un-seeded server lookup resolves
 * to empty props rather than suspending.
 */
export function getOrCreateResource(
  key: string,
  route: Route,
  location: LocationKeyParts,
): DataResource {
  const existing = cache.get(key)
  if (existing) return existing

  if (isServerSide || !route.options.hasHandler) {
    return seedResource(key, { kind: 'data', props: {} })
  }

  const resource = annotate(fetchRouteData(location))
  cache.set(key, resource)
  evictStaleEntries(key)
  return resource
}

/** Drop a resource so the next lookup refetches (used by error `reset`). */
export function invalidateResource(key: string): void {
  cache.delete(key)
}

function evictStaleEntries(currentKey: string): void {
  if (cache.size <= CACHE_LIMIT) return
  // Map preserves insertion order, so this drops the oldest entries first and
  // never evicts the entry currently being rendered.
  for (const key of cache.keys()) {
    if (cache.size <= CACHE_LIMIT) break
    if (key !== currentKey) cache.delete(key)
  }
}
