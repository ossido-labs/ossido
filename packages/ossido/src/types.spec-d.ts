import type { ReactNode } from 'react'
import { describe, it, expectTypeOf } from 'vitest'

import type { OssidoErrorProps } from 'ossido-router'

import type { OssidoLayoutProps } from './types'

describe('OssidoLayoutProps', () => {
  it('should expose `children`', () => {
    expectTypeOf<OssidoLayoutProps>()
      .toHaveProperty('children')
      .toEqualTypeOf<ReactNode>()
  })
})

describe('OssidoErrorProps', () => {
  it('should expose `error` and `reset`', () => {
    expectTypeOf<OssidoErrorProps>()
      .toHaveProperty('error')
      .toEqualTypeOf<Error>()

    expectTypeOf<OssidoErrorProps>()
      .toHaveProperty('reset')
      .toEqualTypeOf<() => void>()
  })
})
