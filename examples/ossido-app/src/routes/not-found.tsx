import type { JSX } from 'react';
import { Link } from '@ossido-labs/ossido';

// Rendered inside the root layout whenever no route matches.
export default function NotFound(): JSX.Element {
  return (
    <div data-testid="not-found">
      <h1>404 — Not found</h1>
      <p>This page took a wrong turn.</p>
      <Link href="/">Back home</Link>
    </div>
  );
}
