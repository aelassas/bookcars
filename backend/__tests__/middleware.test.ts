import 'dotenv/config'
import request from 'supertest'
import * as bookcarsTypes from ':bookcars-types'
import * as databaseHelper from '../src/utils/databaseHelper'
import app from '../src/app'
import * as env from '../src/config/env.config'
import * as testHelper from './testHelper'

const { ADMIN_EMAIL } = testHelper
const { USER_EMAIL } = testHelper
let USER_ID: string

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  await databaseHelper.connect(env.DB_URI, false, false)
  await testHelper.initialize()
  USER_ID = testHelper.getUserId()
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  await testHelper.close()
  await databaseHelper.close()
})

describe('POST /api/sign-in/admin', () => {
  it('should authenticate through admin HttpOnly cookie', async () => {
    // test success (admin auth without origin)
    const payload: bookcarsTypes.SignInPayload = {
      email: ADMIN_EMAIL,
      password: testHelper.PASSWORD,
    }
    let res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Admin}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies.length).toBeGreaterThan(1)
    const cookie = cookies[1].replace(env.X_ACCESS_TOKEN, env.ADMIN_AUTH_COOKIE_NAME)

    // test success (admin auth with origin)
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Admin}`)
      .set('Origin', env.ADMIN_HOST)
      .send(payload)
    expect(res.statusCode).toBe(200)

    // test success (cookie)
    res = await request(app)
      .get(`/api/user/${USER_ID}`)
      .set('Origin', env.ADMIN_HOST)
      .set('Cookie', cookie)
    expect(res.statusCode).toBe(200)
    expect(res.body.email).toBe(USER_EMAIL)

    // test failure (not allowed by CORS)
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Admin}`)
      .set('Origin', 'http://unknow/')
      .send(payload)
    expect(res.statusCode).toBe(500)
  })
})

describe('POST /api/sign-in/frontend', () => {
  it('should authenticate through frontend HttpOnly cookie', async () => {
    // test success (admin auth without origin)
    const payload: bookcarsTypes.SignInPayload = {
      email: USER_EMAIL,
      password: testHelper.PASSWORD,
    }
    let res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies.length).toBeGreaterThan(1)
    const cookie = cookies[1].replace(env.X_ACCESS_TOKEN, env.FRONTEND_AUTH_COOKIE_NAME)

    // test success (admin auth wit origin)
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .set('Origin', env.FRONTEND_HOST)
      .send(payload)
    expect(res.statusCode).toBe(200)

    // test success
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(200)

    // test success (cookie)
    res = await request(app)
      .get(`/api/user/${USER_ID}`)
      .set('Origin', env.FRONTEND_HOST)
      .set('Cookie', cookie)
    expect(res.statusCode).toBe(200)
    expect(res.body.email).toBe(USER_EMAIL)

    // test failure (not allowed by CORS)
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .set('Origin', 'http://unknow/')
      .send(payload)
    expect(res.statusCode).toBe(500)
  })
})

describe('GET /api/user/:id', () => {
  it('should authenticate through request header', async () => {
    let token = await testHelper.signinAsAdmin()

    // test success (admin)
    let res = await request(app)
      .get(`/api/user/${USER_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.email).toBe(USER_EMAIL)

    // test success (user)
    token = await testHelper.signinAsUser()

    res = await request(app)
      .get(`/api/user/${USER_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.email).toBe(USER_EMAIL)

    // test failure (token not found)
    res = await request(app)
      .get(`/api/user/${USER_ID}`)
    expect(res.statusCode).toBe(403)

    // test failure (token not valid)
    res = await request(app)
      .get(`/api/user/${USER_ID}`)
      .set(env.X_ACCESS_TOKEN, 'unknown')
    expect(res.statusCode).toBe(401)

    // test failure (user not found)
    // const user = await User.findById(USER_ID)
    // user!.blacklisted = true
    // await user?.save()
    res = await request(app)
      .get(`/api/user/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)
    // user!.blacklisted = false
    // await user?.save()
  })
})

describe('PATCH /api/user/:id', () => {
  it('should revoke access to PATCH method', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const res = await request(app)
      .patch(`/api/user/${USER_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(405)

    await testHelper.signout(token)
  })
})
