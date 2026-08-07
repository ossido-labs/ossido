import { afterEach, describe, it, expect } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'

import { notifyRouteHotUpdate, useRouteHotVersion } from './hot'

afterEach(cleanup)

// The store version is module-global and monotonic across tests, so assertions
// use deltas from a per-test baseline rather than absolute values.
describe('route hot store', () => {
  it('re-renders subscribers with a bumped version on each notify', () => {
    const seen: Array<number> = []
    function Probe(): null {
      seen.push(useRouteHotVersion())
      return null
    }

    render(<Probe />)
    const baseline = seen[seen.length - 1] as number

    act(() => {
      notifyRouteHotUpdate()
    })
    expect(seen[seen.length - 1]).toBe(baseline + 1)

    act(() => {
      notifyRouteHotUpdate()
    })
    expect(seen[seen.length - 1]).toBe(baseline + 2)
  })

  it('is a no-op (no throw) when there are no subscribers', () => {
    expect(() => {
      notifyRouteHotUpdate()
    }).not.toThrow()
  })

  it('stops notifying an unmounted subscriber', () => {
    const seen: Array<number> = []
    function Probe(): null {
      seen.push(useRouteHotVersion())
      return null
    }

    const { unmount } = render(<Probe />)
    const rendersAtMount = seen.length
    unmount()

    act(() => {
      notifyRouteHotUpdate()
    })
    expect(seen.length).toBe(rendersAtMount)
  })
})
