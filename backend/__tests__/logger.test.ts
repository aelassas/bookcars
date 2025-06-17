import 'dotenv/config'
import * as logger from '../src/common/logger'

describe('Test logging', () => {
  it('should test logging', () => {
    let res = true
    try {
      const obj = { ffo: 'bar' }

      // should show logs
      logger.info('info test')
      logger.info('info test', obj)
      logger.success('success test')
      logger.success('success test', obj)
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
      logger.success('success test')
      logger.success('success test', obj)
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
