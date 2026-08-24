import type { JSX } from 'react';

import TodoApp, { type Todo } from '@/components/TodoApp';

interface TodoListProps {
  todos: Array<Todo>;
}

export default function IndexPage({ todos }: TodoListProps): JSX.Element {
  return (
    <>
      <title>Todos — kitchen sink</title>
      <TodoApp initialTodos={todos} />
    </>
  );
}
