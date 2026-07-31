import type { JSX } from 'react'

/**
 * The page for the `/rust-error` route. Its Rust handler (page.rs) panics, so in
 * dev this never renders — the error overlay takes over instead.
 */
export default function RustErrorPage(): JSX.Element {
  return <h1>Rust error route</h1>
}
