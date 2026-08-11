import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { Route } from '../route';
import type { RouteComponent, RouteProps } from '../types';
import { createRouter } from '../router';

import { getInitialLocation, useRouterContext } from './RouterContext';
import { RouterContextProvider } from './RouterContextProvider';

function createRootComponent(): RouteComponent {
  const RootComponent = (({ children }: RouteProps) => (
    <>{children}</>
  )) as RouteComponent;
  RootComponent.preload = vi.fn();
  RootComponent.displayName = 'root';
  return RootComponent;
}

function buildRouter(): ReturnType<typeof createRouter> {
  const root = new Route({ isRoot: true, component: createRootComponent() });
  return createRouter({ routeTree: root });
}

function NavigationIdProbe(): React.JSX.Element {
  const { navigationId } = useRouterContext();
  return <div data-testid="navigation-id">{String(navigationId)}</div>;
}

describe('getInitialLocation', () => {
  const originalLocation = window.location;
  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
    });
  });

  function setPathname(pathname: string): void {
    Object.defineProperty(window, 'location', {
      value: {
        pathname,
        hash: '',
        href: `http://localhost${pathname}`,
        search: '',
        origin: 'http://localhost',
      },
      configurable: true,
    });
  }

  const emptyPayload = { pathname: '', href: '', searchStr: '' };

  it('strips a trailing slash so the client pathname matches the server payload', () => {
    // Static export serves directory URLs (`/docs/x/`); the server payload is
    // the sanitized `/docs/x`. Without this, hydration mismatches (React #418).
    setPathname('/documentation/contributing/');
    expect(getInitialLocation(emptyPayload).pathname).toBe(
      '/documentation/contributing',
    );
  });

  it('keeps the root path as "/"', () => {
    setPathname('/');
    expect(getInitialLocation(emptyPayload).pathname).toBe('/');
  });

  it('leaves a slash-free pathname unchanged', () => {
    setPathname('/guides');
    expect(getInitialLocation(emptyPayload).pathname).toBe('/guides');
  });
});

describe('<RouterContextProvider /> browser navigation', () => {
  afterEach(cleanup);

  it('bumps the navigation id on popstate so the route refetches', () => {
    render(
      <RouterContextProvider
        router={buildRouter()}
        serverInitialLocation={{ pathname: '/', href: '/', searchStr: '' }}
      >
        <NavigationIdProbe />
      </RouterContextProvider>,
    );

    // Initial render starts at 0 (must be identical on server and client so
    // the seeded initial resource is read without a hydration mismatch).
    expect(screen.getByTestId('navigation-id').textContent).toBe('0');

    // Simulate a browser back/forward navigation.
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    // Regression guard: popstate must bump the navigation id — the key changes,
    // so the route builds a fresh data resource (refetches) instead of reusing
    // stale/cleared data and crashing on back.
    expect(screen.getByTestId('navigation-id').textContent).toBe('1');
  });
});
