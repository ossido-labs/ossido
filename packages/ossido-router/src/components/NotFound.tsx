import type { JSX } from 'react'

import { useRouterContext } from '../components/RouterContext'
import { ROOT_ROUTE_ID } from '../route'

import type { Mode } from '../types'

import { NotFoundDefaultContent } from './NotFoundDefaultContent'
import { CriticalCss } from './CriticalCss'

export function NotFound({ mode }: { mode?: Mode }): JSX.Element | null {
  const { router } = useRouterContext()

  const rootRoute = router.routesById[ROOT_ROUTE_ID]
  const RootLayout = rootRoute?.component

  if (!RootLayout) return null

  // The global not-found is the root `not-found.tsx`, rendered inside the root
  // layout (Next.js semantics). Falls back to the framework default.
  const CustomNotFound = rootRoute?.options.notFoundComponent

  return (
    <RootLayout>
      <CriticalCss routeFilePath="__root__" mode={mode} />
      {CustomNotFound ? <CustomNotFound /> : <NotFoundDefaultContent />}
    </RootLayout>
  )
}
