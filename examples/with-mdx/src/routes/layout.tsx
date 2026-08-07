import type { JSX } from 'react'
import { MDXProvider } from '@mdx-js/react'
import { OssidoScripts } from 'ossido'
import type { OssidoLayoutProps } from 'ossido'

import '../styles/global.css'

export default function RootLayout({
  children,
}: OssidoLayoutProps): JSX.Element {
  return (
    <html>
      <body>
        <main>
          <MDXProvider components={{}}>{children}</MDXProvider>
        </main>
        <OssidoScripts />
      </body>
    </html>
  )
}
