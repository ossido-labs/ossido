import type { JSX } from 'react'
import { Link, TuonoScripts } from 'tuono'
import type { TuonoLayoutProps } from 'tuono'

import '../styles/global.css'

export default function RootLayout({
  children,
}: TuonoLayoutProps): JSX.Element {
  return (
    <html>
      <body className="bg-primary">
        <header className="header">
          <Link href="/">Home</Link>
          <a href="https://crates.io/crates/tuono" target="_blank">
            Crates
          </a>
          <a href="https://www.npmjs.com/package/tuono" target="_blank">
            Npm
          </a>
          <Link href="/test">Test Page</Link>
          <Link href="/rust-error">Rust Error</Link>
          <Link href="/client-error">Client Error</Link>
        </header>
        <main>{children}</main>
        <TuonoScripts />
      </body>
    </html>
  )
}
