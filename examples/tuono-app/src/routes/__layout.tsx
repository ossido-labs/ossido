import type { JSX } from 'react'
import { TuonoScripts } from 'tuono'
import type { TuonoLayoutProps } from 'tuono'

import '../styles/global.css'

export default function RootLayout({
  children,
}: TuonoLayoutProps): JSX.Element {
  return (
    <html>
      <body className="bg-primary">
        <main>{children}</main>
        <TuonoScripts />
      </body>
    </html>
  )
}
