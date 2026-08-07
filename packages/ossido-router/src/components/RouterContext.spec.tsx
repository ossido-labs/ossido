import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'

import { Route } from '../route'
import type { RouteComponent, RouteProps } from '../types'
import { createRouter } from '../router'

import { useRouterContext } from './RouterContext'
import { RouterContextProvider } from './RouterContextProvider'

function createRootComponent(): RouteComponent {
  const RootComponent = (({ children }: RouteProps) => (
    <>{children}</>
  )) as RouteComponent
  RootComponent.preload = vi.fn()
  RootComponent.displayName = 'root'
  return RootComponent
}

function buildRouter(): ReturnType<typeof createRouter> {
  const root = new Route({ isRoot: true, component: createRootComponent() })
  return createRouter({ routeTree: root })
}

function NavigationIdProbe(): React.JSX.Element {
  const { navigationId } = useRouterContext()
  return <div data-testid="navigation-id">{String(navigationId)}</div>
}

describe('<RouterContextProvider /> browser navigation', () => {
  afterEach(cleanup)

  it('bumps the navigation id on popstate so the route refetches', () => {
    render(
      <RouterContextProvider
        router={buildRouter()}
        serverInitialLocation={{ pathname: '/', href: '/', searchStr: '' }}
      >
        <NavigationIdProbe />
      </RouterContextProvider>,
    )

    // Initial render starts at 0 (must be identical on server and client so
    // the seeded initial resource is read without a hydration mismatch).
    expect(screen.getByTestId('navigation-id').textContent).toBe('0')

    // Simulate a browser back/forward navigation.
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    // Regression guard: popstate must bump the navigation id — the key changes,
    // so the route builds a fresh data resource (refetches) instead of reusing
    // stale/cleared data and crashing on back.
    expect(screen.getByTestId('navigation-id').textContent).toBe('1')
  })
})
