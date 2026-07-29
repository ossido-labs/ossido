import type { JSX } from 'react'
import { DefaultScreen } from 'tuono-ui'

import { Link } from './Link'

/**
 * Framework default 404 page, shown when no route matches and the app provides
 * no `/404` route. Shares the {@link DefaultScreen} shell with
 * {@link DefaultError} so the two default screens look consistent.
 */
export function NotFoundDefaultContent(): JSX.Element {
  return (
    <DefaultScreen role="status" badge="404" title="Page not found">
      <p className="tuono-screen-text">
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <Link href="/" className="tuono-screen-action">
        Return to homepage
      </Link>
    </DefaultScreen>
  )
}
