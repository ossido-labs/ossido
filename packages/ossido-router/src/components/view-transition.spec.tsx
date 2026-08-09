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
import { Link } from './Link';
import { useRouter } from '../hooks/useRouter';

import { RouterProvider } from './RouterProvider';

/**
 * View transitions wrap the navigation commit in `document.startViewTransition`.
 * The global `viewTransitions` config is a build-time define (absent in tests, so
 * off), which is why these exercise the per-navigation override — the same
 * `runCommit` seam the global flag flows through.
 */

function Page(pageName: string) {
  return function Component(props: { name?: string }): React.JSX.Element {
    const { push } = useRouter();
    return (
      <div>
        <div data-testid="content">{`${pageName}:${props.name ?? 'MISSING'}`}</div>
        <Link data-testid="link-about" href="/about" viewTransition>
          link about
        </Link>
        <button
          data-testid="push-vt"
          onClick={(): void => push('/about', { viewTransition: true })}
        >
          push (vt)
        </button>
        <button data-testid="push-plain" onClick={(): void => push('/about')}>
          push (plain)
        </button>
        <button
          data-testid="push-hash"
          onClick={(): void => push('/#tuono', { viewTransition: true })}
        >
          push (#hash)
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
  const homeRoute = createRoute({ component: Page('home') as never }).update({
    path: '/',
    getParentRoute: () => rootRoute,
    hasHandler: true,
    filePath: '/',
  });
  const aboutRoute = createRoute({ component: Page('about') as never }).update({
    path: '/about',
    getParentRoute: () => rootRoute,
    hasHandler: true,
    filePath: '/about',
  });
  rootRoute.addChildren([homeRoute, aboutRoute]);
  return createRouter({ routeTree: rootRoute });
}

function renderApp(): void {
  render(
    <RouterProvider
      router={makeRouter()}
      serverInitialLocation={{
        pathname: '/',
        href: 'http://localhost/',
        searchStr: '',
      }}
      serverInitialData={{ name: 'HOME' }}
    />,
  );
}

let startViewTransition: ReturnType<typeof vi.fn>;

describe('view transitions', () => {
  beforeEach(() => {
    window.scroll = vi.fn();
    window.history.pushState({}, '', '/');
    // No reduced-motion by default.
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
    // Stub the API and run the callback synchronously (as the real one does).
    startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve(), ready: Promise.resolve() };
    });
    (
      document as unknown as { startViewTransition: unknown }
    ).startViewTransition = startViewTransition;
    global.fetch = vi.fn(async (url: string) => {
      const name = url.includes('/about') ? 'ABOUT' : 'HOME';
      return {
        ok: true,
        json: async (): Promise<unknown> => ({ data: { name }, info: {} }),
      } as Response;
    }) as never;
  });

  afterEach(() => {
    cleanup();
    delete (document as unknown as { startViewTransition?: unknown })
      .startViewTransition;
  });

  it('wraps navigation in startViewTransition when opted in (push option)', async () => {
    renderApp();
    await act(async () => {
      fireEvent.click(screen.getByTestId('push-vt'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('content').textContent).toBe('about:ABOUT'),
    );
    expect(startViewTransition).toHaveBeenCalledTimes(1);
  });

  it('wraps navigation for a <Link viewTransition>', async () => {
    renderApp();
    await act(async () => {
      fireEvent.click(screen.getByTestId('link-about'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('content').textContent).toBe('about:ABOUT'),
    );
    expect(startViewTransition).toHaveBeenCalled();
  });

  it('does NOT use a transition for a plain navigation (config off) but still commits', async () => {
    renderApp();
    await act(async () => {
      fireEvent.click(screen.getByTestId('push-plain'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('content').textContent).toBe('about:ABOUT'),
    );
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it('does NOT transition for a same-page anchor navigation, even when opted in', async () => {
    renderApp();
    await act(async () => {
      fireEvent.click(screen.getByTestId('push-hash'));
    });
    // The navigation still processes (same route), but no transition runs.
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(screen.getByTestId('content').textContent).toBe('home:HOME');
  });

  it('skips the transition under prefers-reduced-motion but still commits', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    renderApp();
    await act(async () => {
      fireEvent.click(screen.getByTestId('push-vt'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('content').textContent).toBe('about:ABOUT'),
    );
    expect(startViewTransition).not.toHaveBeenCalled();
  });
});
