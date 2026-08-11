# Server Actions

Server actions let you write a **Rust function** that the build mirrors into a
**typed TypeScript function** you can call from React — as a plain RPC, as a
`<form action>` handler, or with `useActionState`. It's the mutation counterpart
to `#[handler]` (which loads a page's data): use `#[handler]` to *read* data for
a page, and a server action to *do* something (create, update, delete, submit a
form).

Inspired by React/Next.js server actions, adapted for Ossido's Rust backend.

---

## Mental model

Ossido is **not** React Server Components — there is no `'use server'`
server-reference mechanism. Instead the CLI **generates a concrete, typed
function per action** into `.ossido/actions.ts`. Each generated function is a
normal client function that POSTs to a conventional endpoint and hides the
`fetch` / serialization / error handling. React never treats it as "special"; it
simply matches the call signatures React expects.

```
Rust  #[action] fn create_user(input: CreateUser) -> Result<Created, ActionError>
  │
  ├─ macro      → POST /__ossido/action/<module>/create_user   (an axum handler)
  ├─ CLI codegen → .ossido/actions.ts  ─►  export const createUser = …
  │
TS    import { createUser } from '.ossido/actions'
      const created = await createUser({ name, email })   // typed: Created
```

Everything React gives you for free once a function is wired into
`<form action>` / `useActionState` — `isPending`, `useFormStatus()` — works,
because the generated function is a real function.

---

## Writing an action (Rust)

Actions live in **`actions.rs`** (or **`*.actions.rs`**) files anywhere under
`src/routes/`. A single file can hold many actions.

```rust
// src/routes/newsletter/actions.rs
use ossido::{action, ActionError, Logger, Type};

#[Type]
pub struct Subscribe { pub email: String }

#[Type]
pub struct SubscribeResult { pub id: u64, pub email: String }

#[action]
pub async fn subscribe(input: Subscribe, logger: Logger)
    -> Result<SubscribeResult, ActionError>
{
    logger.info("subscribe action invoked");
    if !input.email.contains('@') {
        return Err(ActionError::message("Please enter a valid email address"));
    }
    Ok(SubscribeResult { id: 1, email: input.email })
}
```

The macro reads everything from the **function signature** (one source of
truth). Arguments are classified like this:

| Argument                    | Meaning                                                   |
| --------------------------- | --------------------------------------------------------- |
| `PrevState<T>`              | Previous `useActionState` value → makes the action stateful |
| `Files`                     | Files uploaded via `multipart/form-data`                  |
| a parameter named `logger`  | The framework `Logger`                                    |
| **first remaining** argument | The **input**, decoded from the request body             |
| any other argument          | An `ApplicationState` field, matched by name (like `#[handler]`) |

Rules & requirements:

- The input and output types must be `#[Type]` (or `#[Props]`) structs so their
  TypeScript is generated and importable.
- The return type is either `Result<T, ActionError>` or a bare `T`. A bare
  return is treated as success.
- Input/state/logger arguments follow the same conventions as `#[handler]` and
  `#[api]`, so state and logging work identically.

### Naming the TypeScript function

By default the generated function is the Rust name, camelCased
(`create_user` → `createUser`). Pass a name to `#[action]` to override it — as a
bare identifier or a string literal:

```rust
#[action(signUp)]            // → export const signUp = …
#[action("signUp")]         // same, but allows names an identifier can't spell
pub async fn submit_signup(/* … */) { /* … */ }
```

The Rust function name and the endpoint URL are unaffected — only the TS export
name changes.

### Stateful actions (`useActionState`)

Add a `PrevState<T>` first parameter to receive the previous state. React
round-trips it on every submit; `PrevState::get()` is `None` on the first
render.

```rust
use ossido::{action, PrevState, Type};

#[Type]
pub struct FormState { pub ok: bool, pub message: String, pub attempts: u32 }

#[action]
pub async fn submit_signup(prev: PrevState<FormState>, input: Subscribe) -> FormState {
    let attempts = prev.get().map(|s| s.attempts + 1).unwrap_or(1);
    if !input.email.contains('@') {
        return FormState { ok: false, message: "Invalid email".into(), attempts };
    }
    FormState { ok: true, message: format!("Subscribed {}", input.email), attempts }
}
```

> `PrevState<T>` is client-supplied and round-tripped verbatim — treat it as
> untrusted input, never as authorization state.

### File uploads (`multipart/form-data`)

Add a `Files` parameter to receive uploaded files. Text fields still decode into
the `input` struct; files are held separately (they're not part of the
TypeScript input type).

```rust
use ossido::{action, ActionError, Files, Type};

#[Type]
pub struct UploadMeta { pub title: String }

#[action]
pub async fn upload_avatar(input: UploadMeta, files: Files)
    -> Result<Uploaded, ActionError>
{
    let file = files.get("avatar")
        .ok_or_else(|| ActionError::message("an avatar file is required"))?;
    // file.filename(), file.content_type(), file.bytes(), file.len()
    save(file.bytes()).await;
    Ok(/* … */)
}
```

`Files` methods: `get(name)` (first file), `get_all(name)` (e.g.
`<input type="file" multiple>`), `contains`, `is_empty`, `names`. Each
`UploadedFile` exposes `filename()`, `content_type()`, `bytes()`, `len()`,
`into_bytes()`. An action can take only `Files` (no `input`) if it has no text
fields.

On the client, pass a `FormData` containing the file — the generated function
detects it and sends `multipart/form-data` automatically. For a no-JS `<Form>`,
set `encType="multipart/form-data"`:

```tsx
<Form action={uploadAvatar} encType="multipart/form-data">
  <input name="title" />
  <input name="avatar" type="file" />
  <button type="submit">Upload</button>
</Form>
```

---

## Calling an action (React)

The build generates one importable function per action into
`.ossido/actions.ts`, named camelCase (`create_user` → `createUser`). It
works in three ways — all against the **same** generated function.

Import the runtime helpers from `@ossido-labs/ossido/actions`.

### 1. Imperative (typed RPC)

```tsx
import { subscribe } from '.ossido/actions'

const result = await subscribe({ email: 'ada@example.com' })
//    ^ SubscribeResult                ^ typed input
```

### 2. `<Form>` — progressive enhancement

`<Form>` renders a real `<form method="post" action={endpoint}>`. When
hydrated, submission is intercepted and the action is called with the form's
`FormData`; **with JS disabled**, the browser does a native POST and the server
replies with a **303 Post/Redirect/Get**.

```tsx
import { Form } from '@ossido-labs/ossido/actions'
import { subscribe } from '.ossido/actions'

<Form action={subscribe}>
  <input name="email" type="email" />
  <button type="submit">Subscribe</button>
</Form>
```

> React's own `<form action={fn}>` also works when hydrated, but has no no-JS
> fallback (there's no URL). Use `<Form>` when you want progressive enhancement.

### 3. `useActionState`

Pass a **stateful** action (one with a `PrevState<T>`) straight to
`useActionState`. You get back `[state, formAction, isPending]`; `isPending` and
`useFormStatus()` come for free from React.

```tsx
import { useActionState } from '@ossido-labs/ossido/actions'
import { submitSignup } from '.ossido/actions'
import type { FormState } from '@ossido-labs/ossido/types'

const INITIAL: FormState = { ok: false, message: '', attempts: 0 }

function Signup() {
  const [state, formAction, isPending] = useActionState(submitSignup, INITIAL)
  return (
    <form action={formAction}>
      <input name="email" type="email" />
      <button disabled={isPending}>{isPending ? 'Submitting…' : 'Sign up'}</button>
      {state.message && <p>{state.message} (attempt {state.attempts})</p>}
    </form>
  )
}
```

---

## Error handling

There are two distinct failure channels:

- **Expected, typed errors** — return `Err(ActionError)`. The response is
  `422 { "error": { message, fields? } }`.
  - An **imperative** call throws `OssidoActionError` (with `.message` and
    optional `.fields`) — catch it with `try/catch`.
  - In a form / `useActionState` flow, prefer modelling recoverable errors
    inside the returned state (`Ok(FormState { ok: false, … })`) so they land in
    `state` instead of throwing.
- **Unexpected panics** — caught by the framework, surfaced through the same dev
  error overlay as any handler panic, and returned as a detail-free `500` in
  production.

```rust
Err(ActionError::message("Please enter a valid email address"))
// or with per-field messages:
Err(ActionError::with_fields("Validation failed", fields))
```

```tsx
import { OssidoActionError } from '@ossido-labs/ossido/actions'

try {
  await createUser(input)
} catch (e) {
  if (e instanceof OssidoActionError) console.log(e.message, e.fields)
}
```

---

## The `@ossido-labs/ossido/actions` package

| Export                         | What it is                                                        |
| ------------------------------ | ---------------------------------------------------------------- |
| `Form`                         | A `<form>` wired to an action with progressive enhancement       |
| `useActionState`               | Re-export of React's hook (one import site)                      |
| `useFormStatus`                | Re-export of React DOM's hook                                    |
| `OssidoActionError`            | Error thrown on a failed action call (`.message`, `.fields`)     |
| `createAction` / `createStatefulAction` | Factories used by the generated `actions.ts` (rarely called directly) |
| `ActionError`, `ActionFn`, `StatefulActionFn` | Types                                             |

The Rust side exports `action`, `ActionError`, `PrevState`, `ActionInputError`
from the `ossido` crate.

---

## How it works (reference)

**Endpoint.** Each action is registered at:

```
POST /__ossido/action/<module>/<fn_name>
```

where `<module>` is the actions file's route path, mangled to a single safe
segment (`newsletter/actions.rs` → `newsletter_actions`). Always POST — the
"verb" is the function name.

**Wire protocol** (`x-ossido-action-version: 1`). One endpoint serves two
callers, chosen by request headers:

- **Hydrated** (generated `fetch`): sends `x-ossido-action: 1`. Body is
  `application/json` `{ "input": <I>, "__ossido_prev_state"?: <P> }`, a
  URL-encoded form (text-only `FormData` / `<form action>`), or
  `multipart/form-data` (a `FormData` containing files). Response is
  `{ "data": <T> }` or `{ "error": <ActionError> }`.
- **No-JS native form POST**: URL-encoded body, `Accept: text/html`, no marker
  header → a **303** redirect back to the referring page.

**Codegen.** On every `.rs` change the CLI regenerates:

- `.ossido/main.rs` — module declarations + `POST` routes for every action.
- `.ossido/actions.ts` — one typed exported function per action.
- `.ossido/types.ts` — the `#[Type]` structs, importable from
  `@ossido-labs/ossido/types`.

You never edit the `.ossido/` directory.

---

## Limitations & notes

- **Middleware / auth** — actions are registered at the router top level, so
  directory-level `middleware.rs` does not automatically wrap them yet.
  Authentication and CSRF for actions are a planned follow-up; the
  `x-ossido-action` header guards the JSON path but the no-JS form path needs a
  real CSRF token.
- **Client-only** — generated functions use a relative `fetch`; they're
  client-interaction primitives and are not meant to be called during SSR.
- **Redirects** — the no-JS success path redirects back to the referrer;
  explicit "redirect to X after success" is a planned addition.

---

## Quick reference

```rust
// Rust — src/routes/**/actions.rs
#[action]
async fn my_action(input: In, /* state, logger */) -> Result<Out, ActionError> { … }

#[action]
async fn my_form(prev: PrevState<State>, input: In) -> State { … }   // useActionState
```

```tsx
// React
import { my_action as myAction, my_form as myForm } from '.ossido/actions'
import { Form, useActionState, OssidoActionError } from '@ossido-labs/ossido/actions'

await myAction(input)                                   // imperative
<Form action={myAction}>…</Form>                        // progressive enhancement
const [state, formAction, isPending] = useActionState(myForm, initial)  // stateful
```
