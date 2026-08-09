import type { JSX } from 'react';
import { OssidoScripts } from '@ossido-labs/ossido';
import type { OssidoLayoutProps } from '@ossido-labs/ossido';

import '../styles/global.css';

export default function RootLayout({
  children,
}: OssidoLayoutProps): JSX.Element {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-11 px-6 pt-30 pb-24">
          {children}
        </main>
        <OssidoScripts />
      </body>
    </html>
  );
}
