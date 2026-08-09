import type { JSX } from 'react';
import { OssidoScripts } from '@ossido-labs/ossido';
import type { OssidoLayoutProps } from '@ossido-labs/ossido';

import '../styles/global.css';

export default function RootLayout({
  children,
}: OssidoLayoutProps): JSX.Element {
  return (
    <html>
      <body>
        <main>{children}</main>
        <OssidoScripts />
      </body>
    </html>
  );
}
