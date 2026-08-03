import type { JSX } from 'react'
import { TuonoScripts } from 'tuono'
import type { TuonoLayoutProps } from 'tuono'

import '../styles/global.css'

export default function RootLayout({
  children,
}: TuonoLayoutProps): JSX.Element {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-11 px-6 pt-30 pb-24">
          {children}
        </main>
        <TuonoScripts />
      </body>
    </html>
  )
}
