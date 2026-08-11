/* eslint-disable react-refresh/only-export-components -- Library entry point:
   intentionally exports the action runtime helpers alongside the <Form>
   component. This module is never a Fast Refresh boundary. */
/**
 * Client runtime for Ossido server actions (`#[ossido::action]`).
 *
 * Ossido is not RSC, so there is no `'use server'` server-reference mechanism.
 * Instead the build generates a concrete, typed function per action into
 * `.ossido/actions.ts`, each created by {@link createAction} /
 * {@link createStatefulAction} here. The generated functions satisfy the React
 * 19 call contracts exactly:
 *
 * ```tsx
 * import { createUser, submitSignup } from '.ossido/actions'
 * import { Form, useActionState } from '@ossido-labs/ossido/actions'
 *
 * // 1. Imperative, fully typed:
 * const created = await createUser({ name, email })
 *
 * // 2. Progressive-enhancement form (works without JS via a native POST):
 * <Form action={createUser}><input name="name" /></Form>
 *
 * // 3. useActionState:
 * const [state, formAction, isPending] = useActionState(submitSignup, initial)
 * <form action={formAction}>…</form>
 * ```
 */
import {
  createElement,
  type FormEvent,
  type FormHTMLAttributes,
  type ReactNode,
} from 'react';

/** The reserved field carrying the previous `useActionState` value. */
const PREV_STATE_FIELD = '__ossido_prev_state';

/** A domain error returned by an action as `Err(ActionError)` on the server. */
export interface ActionError {
  message: string;
  fields?: Record<string, string>;
}

/** Thrown by an action call when the server returns an error (or panics). */
export class OssidoActionError extends Error {
  fields?: Record<string, string>;
  constructor(detail: ActionError) {
    super(detail.message);
    this.name = 'OssidoActionError';
    this.fields = detail.fields;
  }
}

/**
 * A generated action. Callable imperatively with the typed input, or passed to
 * `<form action={fn}>` (React calls it with `FormData`). `url` is the endpoint,
 * used by {@link Form} for the no-JS native POST.
 */
export interface ActionFn<Input, Output> {
  (input: Input): Promise<Output>;
  (formData: FormData): Promise<Output>;
  url: string;
}

/**
 * A generated stateful action (`useActionState`). Callable imperatively, or
 * invoked by React as `(prevState, formData)`.
 */
export interface StatefulActionFn<Input, Output, Prev> {
  (input: Input): Promise<Output>;
  (prev: Prev | null, formData: FormData): Promise<Output>;
  url: string;
}

interface Parsed {
  ok: boolean;
  status: number;
  // The parsed JSON envelope, or undefined if the body was not JSON.
  body: Record<string, unknown> | undefined;
}

function navigate(destination: string): void {
  if (typeof window !== 'undefined') {
    window.location.assign(destination);
  }
}

async function parse(response: Response): Promise<Parsed> {
  let body: Record<string, unknown> | undefined;
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    body = undefined;
  }
  return { ok: response.ok, status: response.status, body };
}

function unwrap<Output>({ ok, status, body }: Parsed): Output {
  if (ok) {
    if (body) {
      if (typeof body.redirect === 'string') {
        navigate(body.redirect);
        return undefined as Output;
      }
      if ('data' in body) return body.data as Output;
    }
    return undefined as Output;
  }
  // Non-2xx: a typed action error, else a panic (`{ info: { serverError } }`).
  if (body && body.error) {
    throw new OssidoActionError(body.error as ActionError);
  }
  const info = body?.info as { serverError?: { message?: string } } | undefined;
  throw new OssidoActionError({
    message: info?.serverError?.message ?? `Server action failed (${status})`,
  });
}

function formDataHasFiles(formData: FormData): boolean {
  let hasFile = false;
  formData.forEach((value) => {
    if (typeof value !== 'string') hasFile = true;
  });
  return hasFile;
}

function cloneFormData(formData: FormData): FormData {
  const clone = new FormData();
  formData.forEach((value, key) => {
    if (typeof value === 'string') clone.append(key, value);
    else clone.append(key, value, value.name);
  });
  return clone;
}

/**
 * POST an action's input, choosing the encoding:
 * - a plain object → JSON;
 * - a `FormData` with only text fields → `application/x-www-form-urlencoded`;
 * - a `FormData` containing files → `multipart/form-data` (sent as-is so the
 *   browser sets the boundary and the files are preserved).
 */
async function callAction<Output>(
  url: string,
  input: unknown,
  hasPrev: boolean,
  prevState: unknown,
): Promise<Output> {
  let response: Response;

  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    if (formDataHasFiles(input)) {
      // Send the FormData directly; do NOT set Content-Type (the browser adds
      // the multipart boundary). Clone before appending prev-state so the
      // caller's FormData is not mutated.
      let body = input;
      if (hasPrev) {
        body = cloneFormData(input);
        body.set(PREV_STATE_FIELD, JSON.stringify(prevState ?? null));
      }
      response = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Ossido-Action': '1' },
        body,
      });
    } else {
      const params = new URLSearchParams();
      input.forEach((value, key) => {
        if (typeof value === 'string') params.append(key, value);
      });
      if (hasPrev)
        params.set(PREV_STATE_FIELD, JSON.stringify(prevState ?? null));
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'X-Ossido-Action': '1',
        },
        body: params.toString(),
      });
    }
  } else {
    const payload: Record<string, unknown> = { input };
    if (hasPrev) payload[PREV_STATE_FIELD] = prevState ?? null;
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Ossido-Action': '1',
      },
      body: JSON.stringify(payload),
    });
  }

  return unwrap<Output>(await parse(response));
}

/** Build a stateless action bound to `url`. Used by the generated client. */
export function createAction<Input, Output>(
  url: string,
): ActionFn<Input, Output> {
  const fn = (arg: Input | FormData): Promise<Output> =>
    callAction<Output>(url, arg, false, undefined);
  return Object.assign(fn, { url }) as ActionFn<Input, Output>;
}

/** Build a stateful action (`useActionState`) bound to `url`. */
export function createStatefulAction<Input, Output, Prev>(
  url: string,
): StatefulActionFn<Input, Output, Prev> {
  const fn = (a: Input | Prev | null, b?: FormData): Promise<Output> => {
    // React's useActionState contract: (prevState, formData).
    if (typeof FormData !== 'undefined' && b instanceof FormData) {
      return callAction<Output>(url, b, true, a);
    }
    // Imperative typed call: (input).
    return callAction<Output>(url, a as Input, false, undefined);
  };
  return Object.assign(fn, { url }) as StatefulActionFn<Input, Output, Prev>;
}

export interface FormProps<Input, Output> extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'action' | 'method'
> {
  /** A generated action (e.g. `createUser`). */
  action: ActionFn<Input, Output>;
  children?: ReactNode;
}

/**
 * A `<form>` wired to a server action with progressive enhancement. When
 * hydrated, submission is intercepted and the action is called with `FormData`.
 * With JS disabled, the rendered `action={fn.url}` makes it a native POST, and
 * the server responds with a 303 Post/Redirect/Get.
 */
export function Form<Input, Output>({
  action,
  children,
  onSubmit,
  ...rest
}: FormProps<Input, Output>): ReactNode {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    onSubmit?.(event);
    if (event.defaultPrevented) return;
    event.preventDefault();
    void action(new FormData(event.currentTarget));
  };

  return createElement(
    'form',
    { method: 'post', action: action.url, onSubmit: handleSubmit, ...rest },
    children,
  );
}

// Re-exported so consumers get everything from one entry. `isPending` and
// `useFormStatus().pending` come for free from React once an action is wired.
export { useActionState } from 'react';
export { useFormStatus } from 'react-dom';
