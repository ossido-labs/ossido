import type { JSX, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

import { Route } from '../route'
import type { RouteComponent, NotFoundComponent } from '../types'
import type { RouterInstanceType } from '../router'

import { NotFound } from './NotFound'
import { useRouterContext } from './RouterContext'
import { NotFoundDefaultContent } from './NotFoundDefaultContent'

vi.mock('../components/RouterContext', () => ({
  useRouterContext: vi.fn(),
}))
vi.mock('./NotFoundDefaultContent', () => ({
  NotFoundDefaultContent: vi.fn(),
}))

interface RouterMock {
  router: Pick<RouterInstanceType, 'routesById'>
}
const useRouterContextMock = vi.mocked(useRouterContext as () => RouterMock)
const NotFoundDefaultContentMock = vi.mocked(NotFoundDefaultContent)

const rootRouteComponentMock = vi
  .fn<(props: { children: ReactNode }) => JSX.Element>()
  .mockImplementation(({ children }) => <div>{children}</div>)

describe('<NotFound />', () => {
  afterEach(() => {
    cleanup()
    useRouterContextMock.mockReset()
    NotFoundDefaultContentMock.mockReset()
    rootRouteComponentMock.mockClear()
  })

  describe('when a root not-found.tsx exists', () => {
    it('should render the custom not-found inside the root layout', () => {
      const customNotFound = vi.fn(() => <span />) as unknown as NotFoundComponent
      const root = new Route({
        isRoot: true,
        component: rootRouteComponentMock as unknown as RouteComponent,
        notFoundComponent: customNotFound,
      })

      useRouterContextMock.mockReturnValue({
        router: { routesById: { __root__: root } },
      })

      render(<NotFound />)

      expect(customNotFound).toHaveBeenCalled()
      expect(rootRouteComponentMock).toHaveBeenCalled()
      expect(NotFoundDefaultContentMock).not.toHaveBeenCalled()
    })
  })

  describe('when no root not-found.tsx exists', () => {
    it('should render the default not-found, wrapped by the root layout', () => {
      const root = new Route({
        isRoot: true,
        component: rootRouteComponentMock as unknown as RouteComponent,
      })

      useRouterContextMock.mockReturnValue({
        router: { routesById: { __root__: root } },
      })

      render(<NotFound />)

      expect(rootRouteComponentMock).toHaveBeenCalled()
      expect(NotFoundDefaultContentMock).toHaveBeenCalledOnce()
    })
  })
})
