import type { JSX } from 'react'

export default function RustErrorPage(): JSX.Element {
  // Never rendered: the Rust handler for this route always panics, so the dev
  // error overlay is shown instead.
  return <p>If you can read this, the Rust handler did not panic.</p>
}
