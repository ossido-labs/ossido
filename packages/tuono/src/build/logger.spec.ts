import { afterEach, describe, expect, it, vi } from 'vitest'

import { createTuonoViteLogger, feLog } from './logger'

describe('feLog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prints a single `[FE]`-tagged line containing the level and message', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    feLog('INFO', 'hello world')

    expect(spy).toHaveBeenCalledTimes(1)
    const line = spy.mock.calls[0]?.[0] as string
    expect(line).toContain('[FE]')
    expect(line).toContain('INFO')
    expect(line).toContain('- hello world')
  })
})

describe('createTuonoViteLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits all levels at the default `info` threshold', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const logger = createTuonoViteLogger('info')

    logger.info('an info')
    logger.warn('a warn')
    logger.error('an error')

    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('suppresses info and warn at the `error` threshold', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const logger = createTuonoViteLogger('error')

    logger.info('dropped')
    logger.warn('dropped')
    logger.error('kept')

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]?.[0]).toContain('- kept')
  })

  it('suppresses everything at the `silent` threshold', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const logger = createTuonoViteLogger('silent')

    logger.info('x')
    logger.warn('x')
    logger.error('x')

    expect(spy).not.toHaveBeenCalled()
  })

  it('sets `hasWarned` when a warning or error is logged', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const logger = createTuonoViteLogger('info')

    expect(logger.hasWarned).toBe(false)
    logger.warn('careful')
    expect(logger.hasWarned).toBe(true)
  })

  it('never clears the screen and reports no error logged', () => {
    const logger = createTuonoViteLogger('info')
    // Tuono owns the console, so `clearScreen` is a no-op and does not throw.
    expect(() => logger.clearScreen('info')).not.toThrow()
    expect(logger.hasErrorLogged(new Error('boom'))).toBe(false)
  })
})
