import type { JSX } from 'react'

import { useRoute } from '../hooks/useRoute'

import type { Mode } from '../types'

import { RouteMatch } from './RouteMatch'
import { NotFound } from './NotFound'
import { useRouterContext } from './RouterContext'

interface MatchesProps {
  mode?: Mode
}

export function Matches({ mode }: MatchesProps): JSX.Element {
  const { location } = useRouterContext()

  const route = useRoute(location.pathname)

  if (!route) {
    return <NotFound mode={mode} />
  }

  return <RouteMatch route={route} mode={mode} />
}
