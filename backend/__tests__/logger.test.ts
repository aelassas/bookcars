import { jest } from '@jest/globals'
import { Scope } from '@sentry/node'

describe('Test logging', () => {
  it('should test logging', async () => {
    let res = true
    try {
      let logger = await import('../src/utils/logger.js')
      const obj = { ffo: 'bar' }

      // should show logs
      logger.info('info test')
      logger.info('info test', obj)
      logger.info('info test', 'boom')
      logger.warn('warn test')
      logger.warn('warn test', obj)
      logger.error('error test')
      logger.error('error test', obj)
      logger.error('error test', new Error('test error'))

      // shouldn't show logs
      logger.disableErrorLogging()
      logger.error('error test')
      logger.disableLogging()
      logger.info('info test')

      // should show logs again
      logger.enableLogging()
      logger.info('info test')
      logger.info('info test', obj)
      logger.warn('warn test')
      logger.warn('warn test', obj)
      logger.enableErrorLogging()
      logger.error('error test')
      logger.error('error test', obj)
      logger.error('error test', new Error('test error'))
    } catch {
      res = false
    }
    // test success
    expect(res).toBeTruthy()
  })
})

describe('Test logger with sentry', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('Should test logs when ENABLE_SENTRY is true', async () => {
    jest.unstable_mockModule('../src/config/env.config.js', () => ({
      ENABLE_SENTRY: true,
      SENTRY_DSN_BACKEND: 'https://example@dsn.io/123',
      SENTRY_TRACES_SAMPLE_RATE: 0.5,
    }))

    const captureExceptionMock = jest.fn()
    const withScopeMock = jest.fn((callback: (scope: Scope) => void) => {
      const mockScope = {
        setLevel: jest.fn(),
        setTag: jest.fn(),
        setUser: jest.fn(),
        setExtra: jest.fn(),
      } as unknown as Scope

      callback(mockScope)
    })

    jest.unstable_mockModule('@sentry/node', () => ({
      captureException: captureExceptionMock,
      captureMessage: jest.fn(),
      withScope: withScopeMock,
    }))

    await jest.isolateModulesAsync(async () => {
      const logger = await import('../src/utils/logger.js')
      logger.error('test error', new Error('boom'))
      logger.error('test error', { message: 'boom' })
      logger.error('test error')
    })

    const Sentry = await import('@sentry/node')
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error))
    expect(Sentry.withScope).toHaveBeenCalled()
  })

  it('Should test logs when ENABLE_SENTRY is false', async () => {
    jest.unstable_mockModule('../src/config/env.config.js', () => ({
      ENABLE_SENTRY: false,
      SENTRY_DSN_BACKEND: '',
      SENTRY_TRACES_SAMPLE_RATE: 0.5,
    }))

    const captureExceptionMock = jest.fn()
    const withScopeMock = jest.fn((callback: (scope: Scope) => void) => {
      const mockScope = {
        setTag: jest.fn(),
        setUser: jest.fn(),
        setExtra: jest.fn(),
        setLevel: jest.fn(),
      } as unknown as Scope

      callback(mockScope)
    })

    jest.unstable_mockModule('@sentry/node', () => ({
      captureException: captureExceptionMock,
      captureMessage: jest.fn(),
      withScope: withScopeMock,
    }))

    await jest.isolateModulesAsync(async () => {
      const logger = await import('../src/utils/logger.js')
      logger.error('test error', new Error('boom'))
      logger.error('test error', { message: 'boom' })
      logger.error('test error')
    })

    const Sentry = await import('@sentry/node')
    expect(Sentry.captureException).not.toHaveBeenCalled()
    expect(Sentry.withScope).not.toHaveBeenCalled()
  })
})
