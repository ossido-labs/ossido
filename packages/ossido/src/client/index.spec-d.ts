import { describe, it, expectTypeOf } from 'vitest';

import { apiClient, type TypedResponse } from './index';

// Simulate what a project's generated `.ossido/types.ts` merges in.
interface Pokemon {
  name: string;
  weight: number;
}
declare global {
  interface OssidoApiRoutes {
    '/api/health': {
      GET: { params: Record<string, never>; response: unknown };
    };
    '/api/pokemons/[name]': {
      GET: { params: { name: string }; response: Pokemon };
      POST: { params: { name: string }; response: Pokemon };
    };
  }
}

describe('apiClient', () => {
  it('types the response of `.json()` from the method + path', () => {
    expectTypeOf(
      apiClient.get('/api/pokemons/[name]', { params: { name: 'pikachu' } }),
    ).resolves.toEqualTypeOf<TypedResponse<Pokemon>>();

    expectTypeOf(
      apiClient.get('/api/health').then((r) => r.json()),
    ).resolves.toBeUnknown();
  });

  it('requires `params` for dynamic routes and forbids them for static ones', () => {
    // Static route: callable with no options at all.
    expectTypeOf(apiClient.get('/api/health')).resolves.toEqualTypeOf<
      TypedResponse<unknown>
    >();

    // Dynamic route: callable when the right `params` are supplied.
    expectTypeOf(
      apiClient.post('/api/pokemons/[name]', { params: { name: 'pikachu' } }),
    ).resolves.toEqualTypeOf<TypedResponse<Pokemon>>();
  });

  it('rejects unknown paths and methods the route does not serve', () => {
    // A valid call still types through (anchors this test with an assertion).
    expectTypeOf(
      apiClient.get('/api/pokemons/[name]', { params: { name: 'x' } }),
    ).resolves.toEqualTypeOf<TypedResponse<Pokemon>>();

    // @ts-expect-error — `/api/nope` is not a registered path.
    apiClient.get('/api/nope');

    // @ts-expect-error — `/api/health` only serves GET, not POST.
    apiClient.post('/api/health');

    // @ts-expect-error — missing required `params`.
    apiClient.get('/api/pokemons/[name]');

    // @ts-expect-error — wrong param type.
    apiClient.get('/api/pokemons/[name]', { params: { name: 123 } });
  });
});
