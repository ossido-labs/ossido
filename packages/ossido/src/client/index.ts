/**
 * A typed `fetch` client for a project's `#[api(METHOD)]` routes.
 *
 * The HTTP method is the client method name (`apiClient.post(...)`) so the URL,
 * route params, and the `.json()` response are all inferred from the method +
 * path. The route map is generated into `.ossido/types.ts` as an augmentation of
 * the `Register` interface below:
 *
 * ```ts
 * declare module "@ossido-labs/ossido/client" {
 *   interface Register {
 *     apiRoutes: {
 *       "/api/pokemons/[name]": {
 *         GET: { params: { name: string }; response: import("@ossido-labs/ossido/types").Pokemon }
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * ```ts
 * import { apiClient } from '@ossido-labs/ossido/client'
 *
 * const res = await apiClient.get('/api/pokemons/[name]', { params: { name: 'pikachu' } })
 * const pokemon = await res.json() //=> Pokemon
 * ```
 */

type MethodName = 'get' | 'post' | 'put' | 'patch' | 'delete';
type HttpMethod = Uppercase<MethodName>;

/**
 * Augmentation target for the generated route map. Left empty here; the
 * project's generated `.ossido/types.ts` merges an `apiRoutes` member into it.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Register {}

// Route params are always URL-segment strings; an empty route has
// `Record<string, never>` (no fillable segments).
interface ApiRouteEntry {
  params: Record<string, string>;
  response: unknown;
}
type AnyApiRoutes = Record<string, Partial<Record<HttpMethod, ApiRouteEntry>>>;

/**
 * The registered routes, or a permissive fallback when a project hasn't
 * generated its types yet (so the client stays usable, just untyped).
 */
type ApiRoutes = Register extends { apiRoutes: infer R }
  ? R extends AnyApiRoutes
    ? R
    : AnyApiRoutes
  : AnyApiRoutes;

/** Paths that serve the given HTTP method. */
type PathsFor<M extends HttpMethod> = {
  [P in keyof ApiRoutes]: M extends keyof ApiRoutes[P] ? P : never;
}[keyof ApiRoutes] &
  string;

type EntryFor<
  P extends string,
  M extends HttpMethod,
> = P extends keyof ApiRoutes
  ? M extends keyof ApiRoutes[P]
    ? ApiRoutes[P][M] extends ApiRouteEntry
      ? ApiRoutes[P][M]
      : ApiRouteEntry
    : ApiRouteEntry
  : ApiRouteEntry;

type ParamsOf<P extends string, M extends HttpMethod> = EntryFor<
  P,
  M
>['params'];
type ResponseOf<P extends string, M extends HttpMethod> = EntryFor<
  P,
  M
>['response'];

/**
 * Whether a params object *requires* any key. `{} extends T` is true only when
 * every property of `T` is optional/absent — so a static route
 * (`Record<string, never>`) is `false` and a dynamic one (`{ id: string }`) is
 * `true`. (`keyof T extends never` would be wrong: `keyof Record<string, never>`
 * is `string`, not `never`.)
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type HasKeys<T> = {} extends T ? false : true;

/** A `fetch` {@link Response} whose `json()` is typed to the route's response. */
export interface TypedResponse<T> extends Response {
  json(): Promise<T>;
}

/**
 * `fetch` options minus `method` (the method is the client method name), plus
 * `params` to fill the URL's `[segments]` — required only for dynamic routes.
 */
export type RequestOptions<Params> = Omit<RequestInit, 'method'> &
  (HasKeys<Params> extends true
    ? { params: Params }
    : { params?: Record<string, never> });

type MethodFn<M extends HttpMethod> = <P extends PathsFor<M>>(
  path: P,
  ...args: HasKeys<ParamsOf<P, M>> extends true
    ? [options: RequestOptions<ParamsOf<P, M>>]
    : [options?: RequestOptions<ParamsOf<P, M>>]
) => Promise<TypedResponse<ResponseOf<P, M>>>;

export type ApiClient = { [M in MethodName]: MethodFn<Uppercase<M>> };

export interface CreateApiClientOptions {
  /** Prepended to every request path (e.g. an absolute origin for SSR fetches). */
  baseUrl?: string;
  /** Default `fetch` options merged into every request. */
  defaults?: Omit<RequestInit, 'method'>;
  /** Custom `fetch` implementation (defaults to the global `fetch`). */
  fetch?: typeof fetch;
}

// Matches `[name]` and `[...slug]`, capturing the spread marker and the name.
const PARAM_SEGMENT = /\[(\.\.\.)?([^\]]+)\]/g;

/** Substitute `params` into a path template's `[segments]`. */
function buildPath(path: string, params?: Record<string, unknown>): string {
  if (!params) return path;
  return path.replace(
    PARAM_SEGMENT,
    (_match, spread: string | undefined, name: string) => {
      const value = params[name];
      if (value == null) {
        throw new TypeError(
          `Missing value for route param "${name}" in "${path}"`,
        );
      }
      const str = String(value);
      // A catch-all (`[...slug]`) spans multiple segments, so keep its slashes.
      return spread
        ? str.split('/').map(encodeURIComponent).join('/')
        : encodeURIComponent(str);
    },
  );
}

/** Create an {@link ApiClient}, optionally with a base URL and default options. */
export function createApiClient(
  options: CreateApiClientOptions = {},
): ApiClient {
  const { baseUrl = '', defaults, fetch: fetchImpl } = options;

  const request =
    (method: HttpMethod) =>
    (
      path: string,
      opts: RequestInit & { params?: Record<string, unknown> } = {},
    ): Promise<Response> => {
      const { params, ...init } = opts;
      const url = baseUrl + buildPath(path, params);
      return (fetchImpl ?? fetch)(url, { ...defaults, ...init, method });
    };

  return {
    get: request('GET'),
    post: request('POST'),
    put: request('PUT'),
    patch: request('PATCH'),
    delete: request('DELETE'),
  } as ApiClient;
}

/** The default client — global `fetch`, relative paths. */
export const apiClient: ApiClient = createApiClient();
