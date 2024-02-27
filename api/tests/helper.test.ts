import 'dotenv/config'
import * as Helper from '../src/common/Helper'

describe('test string to boolean', () => {
    it('should convert a string to boolean', () => {
        expect(Helper.StringToBoolean('true')).toBeTruthy()
        expect(Helper.StringToBoolean('false')).toBeFalsy()
        expect(Helper.StringToBoolean('')).toBeFalsy()
    })
})

describe('test join url', () => {
    it('should join two url parts', () => {
        expect(Helper.joinURL('part1/', '/part2')).toBe('part1/part2')
        expect(Helper.joinURL('part1', '/part2')).toBe('part1/part2')
        expect(Helper.joinURL('part1/', 'part2')).toBe('part1/part2')
    })
})
