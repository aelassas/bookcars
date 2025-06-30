import 'dotenv/config'
import { jest } from '@jest/globals'
import { SignJWT } from 'jose'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '../src/common/helper'
import * as env from '../src/config/env.config'

describe('Test string to boolean', () => {
  it('should convert a string to boolean', () => {
    // test success (true)
    expect(helper.StringToBoolean('true')).toBeTruthy()
    // test success (false)
    expect(helper.StringToBoolean('false')).toBeFalsy()
    // test success (falsy value)
    expect(helper.StringToBoolean('')).toBeFalsy()
  })
})

describe('Test join url', () => {
  it('should join two url parts', () => {
    // test success (second part starts with slash)
    expect(helper.joinURL('part1/', '/part2')).toBe('part1/part2')
    // test success (first part not ending with slash)
    expect(helper.joinURL('part1', '/part2')).toBe('part1/part2')
    // test success (second part not starting with slash)
    expect(helper.joinURL('part1/', 'part2')).toBe('part1/part2')
  })
})

describe('Test clone', () => {
  it('should clone an object or an array', () => {
    // test success (object)
    expect(helper.clone({ foo: 'bar' })).toStrictEqual({ foo: 'bar' })
    // test success (array)
    expect(helper.clone([1, 2, 3])).toStrictEqual([1, 2, 3])
  })
})

describe('Test trim', () => {
  it('should test trim', () => {
    // test success (begins and ends with spaces)
    expect(helper.trim('   xxxxxxxx   ', ' ')).toBe('xxxxxxxx')
  })
})

describe('Test getStripeLocale', () => {
  it('should test getStripeLocale', () => {
    // test success (value found)
    expect(helper.getStripeLocale('en')).toBe('en')
    // test success (value not found so should return default one)
    expect(helper.getStripeLocale('')).toBe('auto')
  })
})

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET)
const jwtAlg = 'HS256'

const encryptJWT = async (payload: any) => {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: jwtAlg })
    .setIssuedAt()
  const token = jwt.sign(jwtSecret)
  return token
}

describe('Test validateAccessToken', () => {
  it('should test validateAccessToken', async () => {
    const email = 'unknow@unknown.com'

    // test failure
    expect(await helper.validateAccessToken('unknown' as bookcarsTypes.SocialSignInType, 'token', email)).toBeFalsy()

    // test success (facebook)
    let payload = {}
    let token = await encryptJWT(payload)
    expect(await helper.validateAccessToken(bookcarsTypes.SocialSignInType.Facebook, token, email)).toBeTruthy()

    // test success (apple)
    payload = { email }
    token = await encryptJWT(payload)
    expect(await helper.validateAccessToken(bookcarsTypes.SocialSignInType.Apple, token, email)).toBeTruthy()

    await jest.isolateModulesAsync(async () => {
      // Mock axios with unstable_mockModule
      await jest.unstable_mockModule('axios', () => ({
        default: {
          get: jest.fn().mockResolvedValue({ data: { email } } as unknown as never),
        },
      }))

      // Import modules after mock is set (inside isolateModulesAsync)
      const helper = await import('../src/common/helper') // adjust path

      payload = { data: { email } }
      token = await encryptJWT(payload)
      expect(await helper.validateAccessToken(bookcarsTypes.SocialSignInType.Google, token, email)).toBeTruthy()
      jest.resetModules()
      jest.clearAllMocks()
    })
  })
})

describe('Test safeStringify', () => {
  it('should safe stringify an object', () => {
    // test success (object)
    expect(helper.safeStringify({ foo: 'bar' })).toStrictEqual('{"foo":"bar"}')
    // test failure
    const obj = {
      get foo() {
        throw new Error('Cannot access foo')
      }
    }
    expect(helper.safeStringify(obj)).toStrictEqual('[Unserializable object]')
  })
})
