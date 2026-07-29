import type { ReactNode } from 'react'
import { describe, it, expectTypeOf } from 'vitest'

import type { TuonoErrorProps } from 'tuono-router'

import type { TuonoLayoutProps } from './types'

describe('TuonoLayoutProps', () => {
  it('should expose `children`', () => {
    expectTypeOf<TuonoLayoutProps>()
      .toHaveProperty('children')
      .toEqualTypeOf<ReactNode>()
  })
})

describe('TuonoErrorProps', () => {
  it('should expose `error` and `reset`', () => {
    expectTypeOf<TuonoErrorProps>()
      .toHaveProperty('error')
      .toEqualTypeOf<Error>()

    expectTypeOf<TuonoErrorProps>()
      .toHaveProperty('reset')
      .toEqualTypeOf<() => void>()
  })
})
