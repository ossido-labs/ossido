import type { ReactNode, JSX } from 'react'
import { OssidoScripts } from 'ossido'

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html>
      <body>
        <main>{children}</main>
        <OssidoScripts />
      </body>
    </html>
  )
}
