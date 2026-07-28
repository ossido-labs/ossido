import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'

import { Route } from '../route'
import type { RouteComponent, RouteProps } from '../types'
import { createRouter } from '../router'

import {
  RouterContextProvider,
  useRouterContext,
} from './RouterContext'

function createRootComponent(): RouteComponent {
  const RootComponent = (({ children }: RouteProps) => <>{children}</>) as RouteComponent
  RootComponent.preload = vi.fn()
  RootComponent.displayName = 'root'
  return RootComponent
}

function buildRouter(): ReturnType<typeof createRouter> {
  const root = new Route({ isRoot: true, component: createRootComponent() })
  return createRouter({ routeTree: root })
}

function TransitionProbe(): React.JSX.Element {
  const { isTransitioning } = useRouterContext()
  return <div data-testid="transitioning">{String(isTransitioning)}</div>
}

describe('<RouterContextProvider /> browser navigation', () => {
  afterEach(cleanup)

  it('flags a transition on popstate so props are refetched with the loading state', () => {
    render(
      <RouterContextProvider
        router={buildRouter()}
        serverInitialLocation={{ pathname: '/', href: '/', searchStr: '' }}
      >
        <TransitionProbe />
      </RouterContextProvider>,
    )

    // Initial render is settled, no transition in progress.
    expect(screen.getByTestId('transitioning').textContent).toBe('false')

    // Simulate a browser back/forward navigation.
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    // Regression guard: popstate must go through the same transition flow as
    // `push`/`replace`. Without it the route would render with `isLoading=false`
    // and cleared server props, crashing pages that read those props on back.
    expect(screen.getByTestId('transitioning').textContent).toBe('true')
  })
})
