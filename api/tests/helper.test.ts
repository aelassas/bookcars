import 'dotenv/config'
import * as helper from '../src/common/helper'

describe('test string to boolean', () => {
    it('should convert a string to boolean', () => {
        expect(helper.StringToBoolean('true')).toBeTruthy()
        expect(helper.StringToBoolean('false')).toBeFalsy()
        expect(helper.StringToBoolean('')).toBeFalsy()
    })
})

describe('test join url', () => {
    it('should join two url parts', () => {
        expect(helper.joinURL('part1/', '/part2')).toBe('part1/part2')
        expect(helper.joinURL('part1', '/part2')).toBe('part1/part2')
        expect(helper.joinURL('part1/', 'part2')).toBe('part1/part2')
    })
})
