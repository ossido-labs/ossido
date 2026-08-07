import type { JSX } from 'react'

import { useRoute } from '../hooks/useRoute'

import type { Mode } from '../types'
import { useRouteHotVersion } from '../hot'

import { RouteMatch } from './RouteMatch'
import { NotFound } from './NotFound'
import { useRouterContext } from './RouterContext'

interface MatchesProps {
  mode?: Mode
}

export function Matches({ mode }: MatchesProps): JSX.Element {
  const { location } = useRouterContext()

  // Dev-only: re-render the whole match tree when a route component is
  // hot-swapped (see `../hot`). Inert in prod — the store is never bumped.
  useRouteHotVersion()

  const route = useRoute(location.pathname)

  if (!route) {
    return <NotFound mode={mode} />
  }

  return <RouteMatch route={route} mode={mode} />
}
