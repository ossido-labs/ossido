import { test, expect } from '@playwright/test'

// The index page renders through ossido's streaming SSR path (`finish_render` →
// `render_pool::render_stream`). Unlike the ossido unit test — which uses a
// hand-written stub bundle — this runs against a real `ossido` build, so it is
// the layer that actually covers real `react-dom/server` output flowing through
// the ssr_rs V8 runtime and its polyfills (e.g. the streaming UTF-8 decode that
// the polyfilled `TextDecoder` cannot do with `{ stream: true }`).
test('index page streams a complete SSR document', async ({ request }) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)

  const body = await response.text()
  // A full document reassembled from the stream (shell + streamed reveals),
  // rendered server-side (the raw response — no client JS — carries the content).
  expect(body.startsWith('<!DOCTYPE html>')).toBe(true)
  expect(body).toContain('OSSIDO')
  expect(body.trimEnd().endsWith('</html>')).toBe(true)

  // Streamed responses carry no up-front length: axum's `Body::from_stream`
  // sends a chunked body, whereas a buffered `Html(String)` would set
  // `content-length`. This is the signal that the page took the streaming path
  // rather than being fully buffered.
  expect(response.headers()['content-length']).toBeUndefined()
})
