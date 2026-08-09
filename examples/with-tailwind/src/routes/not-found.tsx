import type { JSX } from 'react';
import { Link } from '@ossido-labs/ossido';

// Rendered inside the root layout whenever no route matches.
export default function NotFound(): JSX.Element {
  return (
    <div data-testid="not-found" className="text-center">
      <h1 className="text-4xl font-extrabold text-white">404 — Not found</h1>
      <p className="mt-3 font-light text-ossido-text-dim">
        This page took a wrong turn.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block font-medium text-ossido-cyan hover:underline"
      >
        Back home
      </Link>
    </div>
  );
}
