import type { JSX } from 'react';
import { OssidoScripts } from '@ossido-labs/ossido';
import type { OssidoLayoutProps } from '@ossido-labs/ossido';
import { getEnv } from '@ossido-labs/ossido/env';

import '../styles/global.css';

export default function RootLayout({
  children,
}: OssidoLayoutProps): JSX.Element {
  // A `#[public]` field from src/env.rs, available on both server and client.
  const appName = getEnv('app_name');

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-sans text-neutral-900 antialiased">
        <main>{children}</main>
        <footer className="py-8 text-center text-sm text-neutral-400">
          {appName} — an ossido example
        </footer>
        <OssidoScripts />
      </body>
    </html>
  );
}
