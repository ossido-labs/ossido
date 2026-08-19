/**
 * Typed access to a project's **public** environment variables — the `#[public]`
 * fields of its `#[ossido::Environment]` Rust struct.
 *
 * The Rust build serializes the public fields into the `__OSSIDO_PUBLIC_ENV__`
 * global (injected into the SSR HTML for the browser, and set on `globalThis`
 * during server rendering). The variable map is generated into `.ossido/types.ts`
 * as an augmentation of the `Register` interface below:
 *
 * ```ts
 * declare module "@ossido-labs/ossido/env" {
 *   interface Register {
 *     env: {
 *       api_url: string
 *       port: number
 *     }
 *   }
 * }
 * ```
 *
 * ```ts
 * import { getEnv } from '@ossido-labs/ossido/env'
 *
 * const apiUrl = getEnv('api_url') //=> string
 * ```
 *
 * Private (non-`#[public]`) fields never leave the server and are not accessible
 * here — read those in Rust with `ossido::get_env!`.
 */

import { PUBLIC_ENV_VARIABLE_NAME } from '../constants';

/**
 * Augmentation target for the generated env map. Left empty here; the project's
 * generated `.ossido/types.ts` merges an `env` member into it.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Register {}

/**
 * The registered public env vars, or a permissive fallback when a project hasn't
 * generated its types yet (so `getEnv` stays usable, just untyped).
 */
export type PublicEnv = Register extends { env: infer E }
  ? E
  : Record<string, unknown>;

/**
 * Read a public environment variable by key, returning a typed copy of its
 * value.
 *
 * Throws if no public environment is available — i.e. the project defines no
 * `#[ossido::Environment]` struct (the Rust equivalent, `get_env!`, is a compile
 * error in that case) — or if the key is not a known public variable.
 */
export function getEnv<K extends keyof PublicEnv>(key: K): PublicEnv[K];
/**
 * Read a public environment variable, collapsing an optional value to a concrete
 * `T`: `fallback` is returned whenever the value is absent (an optional variable
 * unset, or no public environment available). The `null`/`undefined` member is
 * stripped from the return type.
 *
 * ```ts
 * // env type: { analytics_enabled: boolean | null }
 * const analytics = getEnv('analytics_enabled', false); //=> boolean
 * ```
 */
export function getEnv<K extends keyof PublicEnv>(
  key: K,
  fallback: NonNullable<PublicEnv[K]>,
): NonNullable<PublicEnv[K]>;
export function getEnv<K extends keyof PublicEnv>(
  key: K,
  fallback?: NonNullable<PublicEnv[K]>,
): PublicEnv[K] {
  const hasFallback = fallback !== undefined;

  const env = (globalThis as Record<string, unknown>)[
    PUBLIC_ENV_VARIABLE_NAME
  ] as PublicEnv | undefined;

  if (env == null) {
    if (hasFallback) return fallback;
    throw new Error(
      'getEnv: no public environment is available. Define an `Environment` struct ' +
        'with `#[ossido::Environment]` and mark fields `#[public]` to expose them.',
    );
  }

  if (!(key in (env as object))) {
    if (hasFallback) return fallback;
    throw new Error(
      `getEnv: "${String(key)}" is not a public environment variable.`,
    );
  }

  const value = env[key];
  // An unset optional variable serializes to `null`; fall back to the concrete
  // default when one was provided.
  if (hasFallback && (value === null || value === undefined)) {
    return fallback;
  }
  return value;
}
