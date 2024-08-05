import 'dotenv/config'
import * as logger from '../src/common/logger'

describe('Tes logging', () => {
  it('should test logging', () => {
    let res = true
    try {
      const obj = { ffo: 'bar' }

      //
      // Should show logs
      //
      logger.info('info test')
      logger.info('info test', obj)
      logger.error('error test')
      logger.error('error test', obj)
      logger.error('error test', new Error('test error'))

      //
      // Shouldn't show logs
      //
      logger.disableErrorLogging()
      logger.error('error test')
      logger.disableLogging()
      logger.info('info test')

      //
      // Should show logs again
      //
      logger.enableLogging()
      logger.info('info test')
      logger.info('info test', obj)
      logger.enableErrorLogging()
      logger.error('error test')
      logger.error('error test', obj)
      logger.error('error test', new Error('test error'))
    } catch {
      res = false
    }
    expect(res).toBeTruthy()
  })
})
