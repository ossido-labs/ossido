import { useState } from 'react';
import type { JSX } from 'react';

import { addNote } from '../../.ossido/actions';

interface Note {
  id: number;
  text: string;
}

export default function NotesPage({
  notes: initialNotes,
}: {
  notes: Array<Note>;
}): JSX.Element {
  // Seeded from the SSR props; the action returns the fresh list on insert.
  const [notes, setNotes] = useState(initialNotes);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const onAdd = async (): Promise<void> => {
    try {
      const saved = await addNote({ text });
      setNotes(saved.notes);
      setText('');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'failed');
    }
  };

  return (
    <>
      <title>Notes — with-sqlx</title>
      <section>
        <h1>Notes</h1>
        <div>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Write a note"
          />
          <button type="button" onClick={() => void onAdd()}>
            Add
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        <ul>
          {notes.map((note) => (
            <li key={note.id}>{note.text}</li>
          ))}
        </ul>
        {notes.length === 0 && <p>No notes yet.</p>}
      </section>
    </>
  );
}
