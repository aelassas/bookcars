import 'dotenv/config'
import * as env from '../src/config/env.config'

describe('Test configuration options', () => {
    it('should test configuration options', async () => {
      // test success (found and required)
        const SMTP_HOST = env.__env__('BC_SMTP_HOST', true)
        expect(!!SMTP_HOST).toBeTruthy()

        // test failure (not found and required)
        let res = true
        try {
            const UNKNOWN = env.__env__('BC_UNKNOWN', true)
            expect(!!UNKNOWN).toBeFalsy()
        } catch {
            res = false
        }
        expect(res).toBeFalsy()

        // test success (found and optional)
        const PORT = env.__env__('BC_PORT', false, '4002')
        expect(!!PORT).toBeTruthy()

        // test success (not found and optional)
        const UNKNOWN = env.__env__('BC_UNKNOWN', false)
        expect(!!UNKNOWN).toBeFalsy()
    })
})
