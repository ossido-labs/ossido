import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { createRoute, createRouter } from '../index';
import { useRouter } from '../hooks/useRouter';

import { RouterProvider } from './RouterProvider';

/**
 * Reproduces the original bug: after a client-side navigation, pressing the
 * browser Back button must refetch the destination's server data (not render
 * stale/empty data and crash). In the Suspense model a rendered page always has
 * resolved data, so we assert Back shows freshly fetched data.
 */

interface PageData {
  name: string;
}

function makePage(pageName: string) {
  return function Page(props: Partial<PageData>): React.JSX.Element {
    const { push } = useRouter();
    return (
      <div>
        <div data-testid="content">{`${pageName}:${props.name ?? 'MISSING'}`}</div>
        <button
          data-testid="go-about"
          onClick={(): void => push('/about', { scroll: false })}
        >
          about
        </button>
      </div>
    );
  };
}

function makeRouter(): ReturnType<typeof createRouter> {
  const rootRoute = createRoute({
    component: (({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    )) as never,
  });
  const homeRoute = createRoute({
    component: makePage('home') as never,
  }).update({
    path: '/',
    getParentRoute: () => rootRoute,
    hasHandler: true,
    filePath: '/',
  });
  const aboutRoute = createRoute({
    component: makePage('about') as never,
  }).update({
    path: '/about',
    getParentRoute: () => rootRoute,
    hasHandler: true,
    filePath: '/about',
  });
  rootRoute.addChildren([homeRoute, aboutRoute]);
  return createRouter({ routeTree: rootRoute });
}

describe('browser back navigation after client-side routing', () => {
  beforeEach(() => {
    window.scroll = vi.fn();
    window.history.pushState({}, '', '/');
    global.fetch = vi.fn(async (url: string) => {
      const pathname = url.replace('/__ossido/data', '');
      const name = pathname.startsWith('/about') ? 'ABOUT' : 'HOME';
      return {
        ok: true,
        json: async (): Promise<unknown> => ({ data: { name }, info: {} }),
      } as Response;
    }) as never;
  });

  afterEach(cleanup);

  it('refetches the destination server data on Back', async () => {
    render(
      <RouterProvider
        router={makeRouter()}
        serverInitialLocation={{
          pathname: '/',
          href: 'http://localhost/',
          searchStr: '',
        }}
        serverInitialData={{ name: 'HOME_SSR' }}
      />,
    );

    // 1. Initial render reads the seeded SSR data synchronously.
    expect(screen.getByTestId('content').textContent).toBe('home:HOME_SSR');

    // 2. Client-navigate to /about — suspends, fetches, then renders.
    await act(async () => {
      fireEvent.click(screen.getByTestId('go-about'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('content').textContent).toBe('about:ABOUT'),
    );

    // 3. Browser Back to '/'. It must refetch (fresh 'HOME'), not reuse the
    // stale SSR value or the previous route's data.
    await act(async () => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('content').textContent).toBe('home:HOME'),
    );
  });
});
