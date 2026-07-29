import { useEffect } from 'react'

import { useRouter } from '../hooks/useRouter'

interface RedirectProps {
  to: string
}

/**
 * Performs a client-side redirect (returned from a route's data load) in an
 * effect — never during render, since navigation is a side effect and the app
 * renders under `StrictMode`. Uses `replace` so the redirecting URL does not
 * become a back-button trap.
 */
export function Redirect({ to }: RedirectProps): null {
  const { replace } = useRouter()

  useEffect(() => {
    replace(to)
  }, [replace, to])

  return null
}
