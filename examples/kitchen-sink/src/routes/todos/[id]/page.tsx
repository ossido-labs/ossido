import type { JSX } from 'react';
import { Link } from '@ossido-labs/ossido';

interface TodoDetailProps {
  id: number;
  title: string;
  done: boolean;
  created_at: string;
}

export default function TodoDetailPage({
  id,
  title,
  done,
  created_at,
}: TodoDetailProps): JSX.Element {
  return (
    <>
      <title>{`Todo #${id}`}</title>
      <article className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p
          className={`mt-3 inline-block rounded-full px-3 py-1 text-sm ${
            done
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {done ? 'Done' : 'Still to do'}
        </p>
        <p className="mt-3 text-sm text-neutral-500">Created {created_at}</p>
        <Link
          href="/"
          className="mt-6 inline-block text-ossido-red hover:underline"
        >
          ← Back to the list
        </Link>
      </article>
    </>
  );
}
