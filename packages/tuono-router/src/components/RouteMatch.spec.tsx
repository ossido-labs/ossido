import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import { Route } from '../route'
import type { RouteComponent } from '../types'
import type { ParsedLocation } from '../components/RouterContext'
import { useRouterContext } from '../components/RouterContext'
import { buildResourceKey, seedResource } from '../data/resourceCache'

import { RouteMatch } from './RouteMatch'

function createLayoutComponent(routeType: string): RouteComponent {
  const LayoutComponent = (({ children }: { children: React.ReactNode }) => (
    <div data-testid={routeType}>
      {`${routeType} route`}
      {children}
    </div>
  )) as RouteComponent
  LayoutComponent.preload = vi.fn()
  LayoutComponent.displayName = routeType
  return LayoutComponent
}

// A page component receives the server data spread directly as its props.
function createLeafRouteComponent(routeType: string): RouteComponent {
  const LeafComponent = ((props: Record<string, unknown>) => (
    <div data-testid={routeType}>{JSON.stringify(props)}</div>
  )) as RouteComponent
  LeafComponent.preload = vi.fn()
  LeafComponent.displayName = routeType
  return LeafComponent
}

const root = new Route({
  isRoot: true,
  component: createLayoutComponent('root'),
})

const parent = new Route({
  component: createLayoutComponent('parent'),
  getParentRoute: (): Route => root,
})

const route = new Route({
  component: createLeafRouteComponent('current'),
  getParentRoute: (): Route => parent,
})

vi.mock('../components/RouterContext', () => ({
  useRouterContext: vi.fn(),
}))

const useRouterContextMock = vi.mocked(useRouterContext)

const location: ParsedLocation = {
  href: 'http://localhost/',
  pathname: '/',
  search: {},
  searchStr: '',
  hash: '',
}

describe('<RouteMatch />', () => {
  afterEach(cleanup)

  it('renders nested layouts and spreads the resolved data as the leaf props', () => {
    // Seed the resource the leaf reads so `use()` resolves synchronously.
    seedResource(buildResourceKey(0, location), {
      kind: 'data',
      props: { some: 'data' },
    })

    // @ts-expect-error only these fields are used by RouteMatch
    useRouterContextMock.mockReturnValue({
      location,
      navigationId: 0,
      retry: vi.fn(),
    })

    render(<RouteMatch route={route} />)

    expect(screen.getByTestId('root')).toMatchInlineSnapshot(`
      <div
        data-testid="root"
      >
        root route
        <div
          data-testid="parent"
        >
          parent route
          <div
            data-testid="current"
          >
            {"some":"data"}
          </div>
        </div>
      </div>
    `)
  })

  it('shows the route loading component while the data is pending', () => {
    // A never-resolving fetch keeps the resource pending → the leaf suspends.
    global.fetch = vi.fn(() => new Promise(() => undefined)) as never

    const LoadingComponent = (): React.JSX.Element => (
      <div data-testid="loading">loading</div>
    )
    const pendingRoute = new Route({
      component: createLeafRouteComponent('current'),
      getParentRoute: (): Route => root,
    })
    pendingRoute.options.hasHandler = true
    pendingRoute.options.loadingComponent = LoadingComponent

    // navigationId 1 → a key that is not seeded, so the resource is fetched.
    // @ts-expect-error only these fields are used by RouteMatch
    useRouterContextMock.mockReturnValue({
      location,
      navigationId: 1,
      retry: vi.fn(),
    })

    render(<RouteMatch route={pendingRoute} />)

    expect(screen.getByTestId('loading')).toBeDefined()
  })

  it('shows the youch-like dev overlay for a thrown error in dev mode', () => {
    seedResource(buildResourceKey(0, location), { kind: 'data', props: {} })
    const throwingRoute = new Route({
      component: (() => {
        throw new Error('boom')
      }) as unknown as RouteComponent,
      getParentRoute: (): Route => root,
    })
    throwingRoute.options.hasHandler = false

    // @ts-expect-error only these fields are used by RouteMatch
    useRouterContextMock.mockReturnValue({
      location,
      navigationId: 0,
      retry: vi.fn(),
    })
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    render(<RouteMatch route={throwingRoute} mode="Dev" />)
    consoleError.mockRestore()

    // Dev overlay surfaces the error message (source is fetched async).
    expect(screen.getByText('boom')).toBeDefined()
  })

  it('shows a detail-free fallback for a thrown error in production', () => {
    seedResource(buildResourceKey(0, location), { kind: 'data', props: {} })
    const throwingRoute = new Route({
      component: (() => {
        throw new Error('secret internal detail')
      }) as unknown as RouteComponent,
      getParentRoute: (): Route => root,
    })
    throwingRoute.options.hasHandler = false

    // @ts-expect-error only these fields are used by RouteMatch
    useRouterContextMock.mockReturnValue({
      location,
      navigationId: 0,
      retry: vi.fn(),
    })
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    render(<RouteMatch route={throwingRoute} mode="Prod" />)
    consoleError.mockRestore()

    expect(screen.getByText('Something went wrong')).toBeDefined()
    // The internal error message must NOT leak in production.
    expect(screen.queryByText('secret internal detail')).toBeNull()
  })
})
