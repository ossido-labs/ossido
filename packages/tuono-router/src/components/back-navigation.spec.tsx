import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { createRoute, createRouter } from '../index'
import type { RouteProps } from '../types'
import { useRouter } from '../hooks/useRouter'

import { RouterProvider } from './RouterProvider'

/**
 * Reproduces the reported bug: after a client-side navigation, pressing the
 * browser Back button left the destination page with missing server props and
 * crashed, because `popstate` did not flag a transition (so the page rendered
 * with cleared data while `isLoading` was already `false`).
 *
 * The invariant we assert — "if the page has no data, it must be loading" — is
 * exactly what breaks without the fix.
 */

interface PageData {
  name: string
}

// Records every (data, isLoading) pair each page component renders with, so we
// can assert the no-data-while-not-loading invariant across the whole flow.
const renderLog: Array<{ page: string; hasData: boolean; isLoading: boolean }> =
  []

function makePage(pageName: string) {
  return function Page({ data, isLoading }: RouteProps<PageData>): React.JSX.Element {
    renderLog.push({ page: pageName, hasData: data != null, isLoading: !!isLoading })
    const { push } = useRouter()
    return (
      <div>
        <div data-testid="content">
          {isLoading ? 'loading' : `${pageName}:${data?.name ?? 'MISSING'}`}
        </div>
        <button
          data-testid="go-about"
          onClick={(): void => push('/about', { scroll: false })}
        >
          about
        </button>
      </div>
    )
  }
}

function makeRouter(): ReturnType<typeof createRouter> {
  const rootRoute = createRoute({
    component: (({ children }: RouteProps) => <>{children}</>) as never,
  })
  const homeRoute = createRoute({ component: makePage('home') as never }).update({
    path: '/',
    getParentRoute: () => rootRoute,
    hasHandler: true,
    filePath: '/',
  })
  const aboutRoute = createRoute({ component: makePage('about') as never }).update({
    path: '/about',
    getParentRoute: () => rootRoute,
    hasHandler: true,
    filePath: '/about',
  })
  rootRoute.addChildren([homeRoute, aboutRoute])
  return createRouter({ routeTree: rootRoute })
}

describe('browser back navigation after client-side routing', () => {
  beforeEach(() => {
    renderLog.length = 0
    window.scroll = vi.fn()
    // Reset URL to the home page for each test.
    window.history.pushState({}, '', '/')
    global.fetch = vi.fn(async (url: string) => {
      const pathname = url.replace('/__tuono/data', '')
      const name = pathname.startsWith('/about') ? 'ABOUT' : 'HOME'
      return {
        json: async (): Promise<unknown> => ({ data: { name }, info: {} }),
      } as Response
    }) as never
  })

  afterEach(cleanup)

  it('refetches server props on Back and never renders empty data without a loading flag', async () => {
    render(
      <RouterProvider
        router={makeRouter()}
        serverInitialLocation={{ pathname: '/', href: 'http://localhost/', searchStr: '' }}
        serverInitialData={{ name: 'HOME_SSR' }}
      />,
    )

    // 1. Initial SSR render shows the dehydrated home props.
    expect(screen.getByTestId('content').textContent).toBe('home:HOME_SSR')

    // 2. Client-side navigate to /about — refetches its props.
    await act(async () => {
      fireEvent.click(screen.getByTestId('go-about'))
    })
    await waitFor(() =>
      expect(screen.getByTestId('content').textContent).toBe('about:ABOUT'),
    )

    // 3. Press browser Back to '/'. The framework must refetch home's props.
    await act(async () => {
      window.history.pushState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await waitFor(() =>
      expect(screen.getByTestId('content').textContent).toBe('home:HOME'),
    )

    // 4. The invariant: no page ever rendered with missing data while NOT
    // loading. A violation is the crash the user reported.
    const brokenRenders = renderLog.filter((r) => !r.hasData && !r.isLoading)
    expect(brokenRenders).toEqual([])
  })
})
