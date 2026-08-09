import { describe, it, expect } from 'vitest';

import { createUtf8Streamer } from './utils';

/**
 * Feed `bytes` to a fresh streamer, cutting it into chunks at the given byte
 * offsets, and return the concatenation of every `push` result plus `flush`.
 */
function feed(bytes: Uint8Array, splits: Array<number>): string {
  const streamer = createUtf8Streamer();
  let out = '';
  let prev = 0;
  for (const at of [...splits, bytes.length]) {
    out += streamer.push(bytes.subarray(prev, at));
    prev = at;
  }
  return out + streamer.flush();
}

// One character of each UTF-8 length (1, 2, 3, 4 bytes) plus ASCII bookends.
const SAMPLE = 'aé中🎉z';
const SAMPLE_BYTES = new TextEncoder().encode(SAMPLE);

describe('createUtf8Streamer', () => {
  it('emits complete content immediately and flushes empty', () => {
    const streamer = createUtf8Streamer();
    expect(streamer.push(new TextEncoder().encode('hello'))).toBe('hello');
    expect(streamer.flush()).toBe('');
  });

  it('holds back an incomplete trailing sequence until it completes', () => {
    const streamer = createUtf8Streamer();
    const [b0, b1] = new TextEncoder().encode('é'); // [0xC3, 0xA9]

    // First byte alone is an incomplete 2-byte sequence — emit nothing yet.
    expect(streamer.push(new Uint8Array([b0!]))).toBe('');
    // Second byte completes it.
    expect(streamer.push(new Uint8Array([b1!]))).toBe('é');
    expect(streamer.flush()).toBe('');
  });

  it('reassembles a multi-byte character split at any single boundary', () => {
    for (let i = 0; i <= SAMPLE_BYTES.length; i++) {
      expect(feed(SAMPLE_BYTES, [i])).toBe(SAMPLE);
    }
  });

  it('reassembles when fed one byte at a time', () => {
    const splits = Array.from(
      { length: SAMPLE_BYTES.length - 1 },
      (_, i) => i + 1,
    );
    expect(feed(SAMPLE_BYTES, splits)).toBe(SAMPLE);
  });

  it('handles empty chunks and empty input', () => {
    expect(feed(new Uint8Array(0), [])).toBe('');
    const streamer = createUtf8Streamer();
    expect(streamer.push(new Uint8Array(0))).toBe('');
    expect(streamer.flush()).toBe('');
  });
});
