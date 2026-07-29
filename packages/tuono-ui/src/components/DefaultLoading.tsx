/**
 * Framework default `<Suspense>` fallback used when a route has no nearest
 * `loading.tsx`. Intentionally renders nothing — apps provide their own
 * `loading.tsx` for real loading UI.
 */
export function DefaultLoading(): null {
  return null
}
