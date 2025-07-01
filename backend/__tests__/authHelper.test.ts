import 'dotenv/config'
import { jest } from '@jest/globals'
import { SignJWT } from 'jose'
import * as bookcarsTypes from ':bookcars-types'
import * as authHelper from '../src/common/authHelper'
import * as env from '../src/config/env.config'

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET)
const jwtAlg = 'HS256'

const encryptJWT = async (payload: any) => {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: jwtAlg })
    .setIssuedAt()
  const token = jwt.sign(jwtSecret)
  return token
}

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
})

describe('Test validateAccessToken', () => {
  it('should test validateAccessToken', async () => {
    const email = 'unknow@unknown.com'

    // test failure
    expect(await authHelper.validateAccessToken('unknown' as bookcarsTypes.SocialSignInType, 'token', email)).toBeFalsy()

    // test success (facebook)
    let payload = {}
    let token = await encryptJWT(payload)
    expect(await authHelper.validateAccessToken(bookcarsTypes.SocialSignInType.Facebook, token, email)).toBeTruthy()

    // test success (apple)
    payload = { email }
    token = await encryptJWT(payload)
    expect(await authHelper.validateAccessToken(bookcarsTypes.SocialSignInType.Apple, token, email)).toBeTruthy()

    await jest.isolateModulesAsync(async () => {
      // Mock axios with unstable_mockModule
      await jest.unstable_mockModule('axios', () => ({
        default: {
          get: jest.fn(() => Promise.resolve({ data: { email } })),
        },
      }))
      jest.resetModules()

      // Import modules after mock is set (inside isolateModulesAsync)
      const authHelper = await import('../src/common/authHelper')

      payload = { data: { email } }
      token = await encryptJWT(payload)
      expect(await authHelper.validateAccessToken(bookcarsTypes.SocialSignInType.Google, token, email)).toBeTruthy()
    })
  })
})
