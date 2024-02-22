import 'dotenv/config'
import request from 'supertest'
import * as bookcarsTypes from 'bookcars-types'
import * as DatabaseHelper from '../src/common/DatabaseHelper'
import app from '../src/app'
import * as env from '../src/config/env.config'
import * as TestHelper from './TestHelper'

const { ADMIN_EMAIL } = TestHelper
const { USER_EMAIL } = TestHelper
let USER_ID: string

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
    if (await DatabaseHelper.Connect()) {
        await TestHelper.initialize()
        USER_ID = TestHelper.getUserId()
    }
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
    await TestHelper.close()
    await DatabaseHelper.Close()
})

describe('GET /api/user/:id', () => {
    it('should authenticate through backend HttpOnly cookie', async () => {
        const payload: bookcarsTypes.SignInPayload = {
            email: ADMIN_EMAIL,
            password: TestHelper.PASSWORD,
        }

        let res = await request(app)
            .post(`/api/sign-in/${bookcarsTypes.AppType.Backend}`)
            .send(payload)
        expect(res.statusCode).toBe(200)
        const cookies = res.headers['set-cookie'] as unknown as string[]
        expect(cookies.length).toBeGreaterThan(1)
        const cookie = cookies[1].replace(env.X_ACCESS_TOKEN, env.BACKEND_AUTH_COOKIE_NAME)

        res = await request(app)
            .post(`/api/sign-in/${bookcarsTypes.AppType.Backend}`)
            .set('Origin', env.BACKEND_HOST)
            .send(payload)
        expect(res.statusCode).toBe(200)

        res = await request(app)
            .get(`/api/user/${USER_ID}`)
            .set('Origin', env.BACKEND_HOST)
            .set('Cookie', cookie)
        expect(res.statusCode).toBe(200)
        expect(res.body.email).toBe(USER_EMAIL)
    })
})

describe('GET /api/user/:id', () => {
    it('should authenticate through frontend HttpOnly cookie', async () => {
        const payload: bookcarsTypes.SignInPayload = {
            email: USER_EMAIL,
            password: TestHelper.PASSWORD,
        }

        let res = await request(app)
            .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
            .send(payload)
        expect(res.statusCode).toBe(200)
        const cookies = res.headers['set-cookie'] as unknown as string[]
        expect(cookies.length).toBeGreaterThan(1)
        const cookie = cookies[1].replace(env.X_ACCESS_TOKEN, env.FRONTEND_AUTH_COOKIE_NAME)

        res = await request(app)
            .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
            .set('Origin', env.FRONTEND_HOST)
            .send(payload)
        expect(res.statusCode).toBe(200)

        res = await request(app)
            .get(`/api/user/${USER_ID}`)
            .set('Origin', env.FRONTEND_HOST)
            .set('Cookie', cookie)
        expect(res.statusCode).toBe(200)
        expect(res.body.email).toBe(USER_EMAIL)
    })
})

describe('GET /api/user/:id', () => {
    it('should authenticate through request header', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .get(`/api/user/${USER_ID}`)
            .set(env.X_ACCESS_TOKEN, token)
        expect(res.statusCode).toBe(200)
        expect(res.body.email).toBe(USER_EMAIL)

        await TestHelper.signout(token)
    })
})

describe('PATCH /api/user/:id', () => {
    it('should revoke access to PATCH method', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .patch(`/api/user/${USER_ID}`)
            .set(env.X_ACCESS_TOKEN, token)
        expect(res.statusCode).toBe(405)

        await TestHelper.signout(token)
    })
})
