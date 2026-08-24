import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useActionState } from '@ossido-labs/ossido/actions';
import { Link } from '@ossido-labs/ossido';

import { addTodo, deleteTodo, toggleTodo } from '../../.ossido/actions';

export interface Todo {
  id: number;
  title: string;
  done: boolean;
}

interface AddState {
  ok: boolean;
  message: string;
  todos: Array<Todo> | null;
}

const INITIAL: AddState = { ok: true, message: '', todos: null };

export default function TodoApp({
  initialTodos,
}: {
  initialTodos: Array<Todo>;
}): JSX.Element {
  // Seeded from the SSR props; every mutating action returns the fresh list
  // from the database, which replaces this state.
  const [todos, setTodos] = useState(initialTodos);

  // Add form via `useActionState` — React drives `addTodo(prevState, formData)`.
  const [addState, addAction, isAdding] = useActionState(addTodo, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // `todos` is null when the submission was rejected — keep the current list.
    if (addState.todos) {
      setTodos(addState.todos);
      formRef.current?.reset();
    }
  }, [addState]);

  // Imperative, fully typed action calls.
  const onToggle = async (id: number): Promise<void> => {
    setTodos((await toggleTodo({ id })).todos);
  };
  const onDelete = async (id: number): Promise<void> => {
    setTodos((await deleteTodo({ id })).todos);
  };

  return (
    <section className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold">Todos</h1>

      <form ref={formRef} action={addAction} className="mt-6 flex gap-2">
        <input
          name="title"
          placeholder="What needs doing?"
          autoComplete="off"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-ossido-red"
        />
        <button
          type="submit"
          disabled={isAdding}
          className="cursor-pointer rounded-md bg-ossido-red px-4 py-2 text-white disabled:cursor-default disabled:opacity-60"
        >
          {isAdding ? 'Adding…' : 'Add'}
        </button>
      </form>
      {!addState.ok && (
        <p className="mt-2 text-ossido-red-dark">{addState.message}</p>
      )}

      <ul className="mt-6 divide-y divide-neutral-100">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center justify-between gap-2 py-2.5"
          >
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => void onToggle(todo.id)}
                className="size-4 accent-ossido-red"
              />
              <Link
                href={`/todos/${todo.id}`}
                className={
                  todo.done ? 'text-neutral-400 line-through' : undefined
                }
              >
                {todo.title}
              </Link>
            </label>
            <button
              type="button"
              aria-label={`Delete ${todo.title}`}
              onClick={() => void onDelete(todo.id)}
              className="cursor-pointer text-lg text-neutral-400 hover:text-ossido-red-dark"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {todos.length === 0 && (
        <p className="mt-4 text-neutral-500">
          Nothing to do — add your first todo above.
        </p>
      )}
    </section>
  );
}
