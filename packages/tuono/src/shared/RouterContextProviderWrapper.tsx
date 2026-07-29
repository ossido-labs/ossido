import type { JSX } from 'react'
import { RouterProvider } from 'tuono-router'
import type { RouterInstanceType } from 'tuono-router'

import { useTuonoContextServerPayload } from './TuonoContext'

interface RouterContextProviderWrapperProps {
  router: RouterInstanceType
}

/**
 * This component is needed to get the data from {@link TuonoContext}
 * since the provider is also located in {@link TuonoEntryPoint}
 * hence the context cannot be accessed directly there
 *
 * @see https://github.com/tuono-labs/tuono/issues/410
 */
export function RouterContextProviderWrapper({
  router,
}: RouterContextProviderWrapperProps): JSX.Element {
  const serverPayload = useTuonoContextServerPayload()

  return (
    <RouterProvider
      router={router}
      serverInitialLocation={serverPayload.location}
      serverInitialData={serverPayload.data}
      serverInitialLayoutData={serverPayload.layoutData}
      serverInitialError={serverPayload.serverError}
      // Read `mode` from the payload context (available on server AND client);
      // the client `hydrateRoot` passes no `serverPayload` prop, so a prop-based
      // mode would be `undefined` during hydration.
      mode={serverPayload.mode}
    />
  )
}
