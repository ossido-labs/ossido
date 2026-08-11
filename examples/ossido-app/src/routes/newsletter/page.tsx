import { useState } from 'react';
import { Form, useActionState } from '@ossido-labs/ossido/actions';

import {
  subscribe,
  submitSignup,
  uploadAvatar,
} from '../../../.ossido/actions';
import type { FormState } from '@ossido-labs/ossido/types';

const INITIAL: FormState = { ok: false, message: '', attempts: 0 };

export default function NewsletterPage(): React.ReactNode {
  // 3. useActionState — React drives `submitSignup(prevState, formData)`.
  const [state, formAction, isPending] = useActionState(submitSignup, INITIAL);

  // 1. Imperative, fully typed call.
  const [imperative, setImperative] = useState('');
  const onImperative = async (): Promise<void> => {
    try {
      const result = await subscribe({ email: 'imperative@example.com' });
      setImperative(`Created #${result.id} for ${result.email}`);
    } catch (error) {
      setImperative(error instanceof Error ? error.message : 'failed');
    }
  };

  return (
    <div>
      <h1>Newsletter</h1>

      {/* 2. Progressive-enhancement form: works without JS (native POST → 303). */}
      <Form action={subscribe}>
        <input name="email" type="email" placeholder="you@example.com" />
        <button type="submit">Subscribe</button>
      </Form>

      {/* 3. useActionState with the returned formAction. */}
      <form action={formAction}>
        <input name="email" type="email" placeholder="you@example.com" />
        <button type="submit" disabled={isPending}>
          {isPending ? 'Submitting…' : 'Sign up'}
        </button>
        {state.message && (
          <p>
            {state.message} (attempt {state.attempts})
          </p>
        )}
      </form>

      {/* 1. Imperative call. */}
      <button type="button" onClick={onImperative}>
        Imperative subscribe
      </button>
      {imperative && <p>{imperative}</p>}

      {/* 4. multipart/form-data with a file upload. */}
      <Form action={uploadAvatar} encType="multipart/form-data">
        <input name="title" placeholder="Title" />
        <input name="avatar" type="file" />
        <button type="submit">Upload</button>
      </Form>
    </div>
  );
}
