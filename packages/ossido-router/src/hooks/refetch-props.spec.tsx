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
import { RouterProvider } from '../components/RouterProvider';

import { useRouter } from './useRouter';

/**
 * `useRouter().refetchProps()` re-runs the current route's server handler and
 * re-renders the page with the fresh props — e.g. after a mutation changes the
 * data the page was server-rendered with.
 */

interface PageData {
  name: string;
}

// The value the (mocked) server returns on the next data fetch — flipped by the
// test to prove a real refetch happened.
let serverName = 'FIRST';

function HomePage(props: Partial<PageData>): React.JSX.Element {
  const { refetchProps, isRefetching } = useRouter();
  return (
    <div>
      <div data-testid="content">{props.name ?? 'MISSING'}</div>
      <div data-testid="refetching">{String(isRefetching)}</div>
      <button data-testid="refetch" onClick={(): void => refetchProps()}>
        refetch
      </button>
    </div>
  );
}

function makeRouter(): ReturnType<typeof createRouter> {
  const rootRoute = createRoute({
    component: (({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    )) as never,
  });
  const homeRoute = createRoute({
    component: HomePage as never,
  }).update({
    path: '/',
    getParentRoute: () => rootRoute,
    hasHandler: true,
    filePath: '/',
  });
  rootRoute.addChildren([homeRoute]);
  return createRouter({ routeTree: rootRoute });
}

describe('useRouter().refetchProps', () => {
  beforeEach(() => {
    serverName = 'FIRST';
    window.scroll = vi.fn();
    window.history.pushState({}, '', '/');
    global.fetch = vi.fn(
      async () =>
        ({
          ok: true,
          json: async (): Promise<unknown> => ({
            data: { name: serverName },
            info: {},
          }),
        }) as Response,
    ) as never;
  });

  afterEach(cleanup);

  it('refetches the current route and renders the fresh props', async () => {
    render(
      <RouterProvider
        router={makeRouter()}
        serverInitialLocation={{
          pathname: '/',
          href: 'http://localhost/',
          searchStr: '',
        }}
        serverInitialData={{ name: 'SSR' }}
      />,
    );

    // Initial render reads the seeded SSR data synchronously.
    expect(screen.getByTestId('content').textContent).toBe('SSR');

    // The server data has since changed; refetch pulls the fresh value in.
    serverName = 'UPDATED';
    await act(async () => {
      fireEvent.click(screen.getByTestId('refetch'));
    });

    await waitFor(() =>
      expect(screen.getByTestId('content').textContent).toBe('UPDATED'),
    );
    expect(global.fetch).toHaveBeenCalled();
  });
});
