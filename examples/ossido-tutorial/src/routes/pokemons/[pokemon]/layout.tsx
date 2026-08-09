import * as React from 'react';
import { Link } from '@ossido-labs/ossido';

export default function PokemonPageLayout({
  children,
}: React.PropsWithChildren) {
  return (
    <>
      <Link href="/" className="back-link">
        Back
      </Link>
      {children}
    </>
  );
}
