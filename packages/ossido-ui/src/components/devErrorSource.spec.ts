import { describe, expect, it } from 'vitest'

import { errorLabel, initialFrames, parseStack } from './devErrorSource'

const V8_STACK = `Error: Hello, I am error
    at IndexPage (http://localhost:3101/vite-server/@fs/Users/me/app/src/routes/index.tsx:9:9)
    at renderWithHooks (http://localhost:3101/vite-server/cache/deps/react-dom_client.js?v=abc:4392:19)`

// Firefox / Safari format: `fn@url:line:col`, no `Error:` header line, and the
// url contains `@` (vite's `@fs`).
const SPIDERMONKEY_STACK = `IndexPage@http://localhost:3101/vite-server/@fs/Users/me/app/src/routes/index.tsx:9:9
renderWithHooks@http://localhost:3101/vite-server/cache/deps/react-dom_client.js?v=abc:4392:19
@http://localhost:3101/vite-server/@fs/Users/me/app/src/routes/index.tsx:20:3`

// Rust backtrace: a `<n>: <symbol>` frame header followed by an indented
// `at <file>:<line>:<col>` location. Some frames have no location line.
const RUST_STACK = `    at .ossido/../src/routes/rust-error.rs:8:5
   0: std::panicking::begin_panic
             at /rustc/abc/library/std/src/panicking.rs:689:5
  10: ossido_app::routes::rust_error::{{closure}}
             at ./.ossido/../src/routes/rust-error.rs:8:5
  15: ___rust_try`

describe('errorLabel', () => {
  it('uses the subclass constructor name over the generic Error name', () => {
    class TestError extends Error {}
    expect(errorLabel(new TestError('boom'))).toBe('TestError')
  })

  it('falls back to Error for a plain Error', () => {
    expect(errorLabel(new Error('boom'))).toBe('Error')
  })

  it('prefers an explicitly set name when the constructor is generic', () => {
    const error = new Error('boom')
    error.name = 'RangeError'
    expect(errorLabel(error)).toBe('RangeError')
  })
})

describe('parseStack', () => {
  it('parses the V8 / Chrome stack format', () => {
    const frames = parseStack(V8_STACK)
    expect(frames[0]).toEqual({
      fn: 'IndexPage',
      file: 'http://localhost:3101/vite-server/@fs/Users/me/app/src/routes/index.tsx',
      line: 9,
      column: 9,
    })
    expect(frames[1]?.fn).toBe('renderWithHooks')
  })

  it('parses the SpiderMonkey / JavaScriptCore (Firefox, Safari) format', () => {
    const frames = parseStack(SPIDERMONKEY_STACK)
    // The function name is only the part before the FIRST `@`; the `@fs` in the
    // url must stay part of the file.
    expect(frames[0]).toEqual({
      fn: 'IndexPage',
      file: 'http://localhost:3101/vite-server/@fs/Users/me/app/src/routes/index.tsx',
      line: 9,
      column: 9,
    })
    // Anonymous frame (empty function name before `@`).
    expect(frames[2]).toEqual({
      fn: undefined,
      file: 'http://localhost:3101/vite-server/@fs/Users/me/app/src/routes/index.tsx',
      line: 20,
      column: 3,
    })
  })

  it('parses the Rust backtrace format, pairing symbols with locations', () => {
    const frames = parseStack(RUST_STACK)
    // Panic-site frame emitted with no symbol.
    expect(frames[0]).toEqual({
      fn: undefined,
      file: '.ossido/../src/routes/rust-error.rs',
      line: 8,
      column: 5,
    })
    // `<n>: symbol` header pairs with the following `at file:line:col`.
    expect(frames[1]).toEqual({
      fn: 'std::panicking::begin_panic',
      file: '/rustc/abc/library/std/src/panicking.rs',
      line: 689,
      column: 5,
    })
    expect(frames[2]?.fn).toBe('ossido_app::routes::rust_error::{{closure}}')
    expect(frames[2]?.file).toBe('./.ossido/../src/routes/rust-error.rs')
    // A frame with no location line still appears, with just its symbol.
    expect(frames[3]).toEqual({ fn: '___rust_try' })
  })

  it('treats rust stdlib/registry frames as non-application', () => {
    const frames = initialFrames(RUST_STACK)
    const appFrame = frames.find((frame) => frame.isApp)
    // `.ossido/../` is collapsed for readability.
    expect(appFrame?.file).toBe('src/routes/rust-error.rs')
    // The `/rustc/.../library/std` frame is vendor, not app.
    const stdFrame = frames.find((frame) => frame.file?.includes('/rustc/'))
    expect(stdFrame?.isApp).toBe(false)
  })

  it('marks application frames and cleans paths in both formats', () => {
    for (const stack of [V8_STACK, SPIDERMONKEY_STACK]) {
      const frames = initialFrames(stack)
      const appFrame = frames.find((frame) => frame.isApp)
      expect(appFrame?.file).toBe('/Users/me/app/src/routes/index.tsx')
      expect(appFrame?.line).toBe(9)
      // react-dom (in /deps/) is not an application frame.
      expect(frames.some((frame) => frame.isApp === false)).toBe(true)
    }
  })
})
