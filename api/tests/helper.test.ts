import 'dotenv/config'
import * as Helper from '../src/common/Helper'

describe('test string to boolean helper function', () => {
    it('should authenticate through backend HttpOnly cookie', async () => {
        expect(Helper.StringToBoolean('true')).toBeTruthy()
        expect(Helper.StringToBoolean('false')).toBeFalsy()
        expect(Helper.StringToBoolean('')).toBeFalsy()
    })
})

describe('test join url helper function', () => {
    it('should join two url parts', async () => {
        expect(Helper.joinURL('part1/', '/part2')).toBe('part1/part2')
        expect(Helper.joinURL('part1', '/part2')).toBe('part1/part2')
        expect(Helper.joinURL('part1/', 'part2')).toBe('part1/part2')
    })
})
