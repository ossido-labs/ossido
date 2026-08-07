// react ReadableStream type is an empty interface so we are using the one from
// node which match the runtime value
import type { ReadableStream } from 'node:stream/web'

function concatArrayBuffers(chunks: Array<Uint8Array>): Uint8Array {
  const result = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

async function streamToArrayBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const chunks: Array<Uint8Array> = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return concatArrayBuffers(chunks)
}

/**
 * This function awaits for the whole stream before returning the string.
 *
 * NOTE: we should improve the bond between the custom V8 runtime and the
 * renderToReadableStream React function to return a stream directly to the client.
 */
export async function streamToString(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const buffer = await streamToArrayBuffer(stream)
  return new TextDecoder().decode(buffer)
}

/**
 * Index where the last *complete* UTF-8 character ends: bytes `[0, end)` are
 * safe to decode now, `[end, length)` is an incomplete trailing multi-byte
 * sequence to carry into the next chunk. Malformed input decodes as-is.
 */
function completeUtf8End(buf: Uint8Array): number {
  if (buf.length === 0) return 0
  // Walk back over continuation bytes (0b10xxxxxx) to the sequence's lead byte.
  let i = buf.length - 1
  while (i >= 0 && (buf[i]! & 0xc0) === 0x80) i--
  if (i < 0) return buf.length // all continuations (malformed) — decode as-is

  const lead = buf[i]!
  let need: number
  if ((lead & 0x80) === 0) need = 1
  else if ((lead & 0xe0) === 0xc0) need = 2
  else if ((lead & 0xf0) === 0xe0) need = 3
  else if ((lead & 0xf8) === 0xf0) need = 4
  else return buf.length // malformed lead byte — decode as-is

  // Complete sequence → the whole buffer is safe; incomplete → hold it back.
  return buf.length - i >= need ? buf.length : i
}

/**
 * Incremental UTF-8 decoder for the streaming SSR path. The ssr_rs runtime's
 * `TextDecoder` polyfill (`fast-text-encoding`) does not support the
 * `{ stream: true }` option, so we buffer any incomplete trailing byte
 * sequence ourselves and only decode up to a character boundary — keeping
 * multi-byte characters that straddle React's chunk boundaries intact.
 */
export function createUtf8Streamer(): {
  push: (chunk: Uint8Array) => string
  flush: () => string
} {
  const decoder = new TextDecoder()
  let pending = new Uint8Array(0)

  return {
    push(chunk: Uint8Array): string {
      let buf: Uint8Array
      if (pending.length) {
        buf = new Uint8Array(pending.length + chunk.length)
        buf.set(pending, 0)
        buf.set(chunk, pending.length)
      } else {
        buf = chunk
      }
      const end = completeUtf8End(buf)
      pending = buf.slice(end)
      return end > 0 ? decoder.decode(buf.subarray(0, end)) : ''
    },
    flush(): string {
      if (pending.length === 0) return ''
      const out = decoder.decode(pending)
      pending = new Uint8Array(0)
      return out
    },
  }
}
