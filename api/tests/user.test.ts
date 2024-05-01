import 'dotenv/config'
import request from 'supertest'
import url from 'url'
import path from 'path'
import fs from 'node:fs/promises'
import { v1 as uuid } from 'uuid'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/common/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import User from '../src/models/User'
import Token from '../src/models/Token'
import PushToken from '../src/models/PushToken'
import Car from '../src/models/Car'
import Booking from '../src/models/Booking'
import AdditionalDriver from '../src/models/AdditionalDriver'
import * as helper from '../src/common/helper'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const AVATAR1 = 'avatar1.jpg'
const AVATAR1_PATH = path.resolve(__dirname, `./img/${AVATAR1}`)
const AVATAR2 = 'avatar2.png'
const AVATAR2_PATH = path.resolve(__dirname, `./img/${AVATAR2}`)

let USER1_ID: string
let USER2_ID: string
let ADMIN_ID: string

const USER1_EMAIL = `${testHelper.getName('user1')}@test.bookcars.ma`
const USER1_PASSWORD = testHelper.PASSWORD
const USER2_EMAIL = `${testHelper.getName('user2')}@test.bookcars.ma`
const ADMIN_EMAIL = `${testHelper.getName('admin')}@test.bookcars.ma`

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  const res = await databaseHelper.connect(env.DB_URI, false, false)
  expect(res).toBeTruthy()
  await testHelper.initialize()
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  if (mongoose.connection.readyState) {
    await testHelper.close()

    await Token.deleteMany({ user: { $in: [ADMIN_ID] } })

    await databaseHelper.close()
  }
})

//
// Unit tests
//

describe('POST /api/sign-up', () => {
  it('should create a user', async () => {
    const tempAvatar = path.join(env.CDN_TEMP_USERS, AVATAR1)
    if (!await helper.exists(tempAvatar)) {
      fs.copyFile(AVATAR1_PATH, tempAvatar)
    }

    const payload: bookcarsTypes.SignUpPayload = {
      email: USER1_EMAIL,
      password: USER1_PASSWORD,
      fullName: 'user1',
      language: testHelper.LANGUAGE,
      birthDate: new Date(1992, 5, 25),
      phone: '09090909',
      avatar: AVATAR1,
    }
    let res = await request(app)
      .post('/api/sign-up')
      .send(payload)
    expect(res.statusCode).toBe(200)
    let user = await User.findOne({ email: USER1_EMAIL })
    expect(user).not.toBeNull()
    USER1_ID = user?.id
    expect(user?.type).toBe(bookcarsTypes.UserType.User)
    expect(user?.email).toBe(payload.email)
    expect(user?.fullName).toBe(payload.fullName)
    expect(user?.language).toBe(payload.language)
    expect(user?.birthDate).toStrictEqual(payload.birthDate)
    expect(user?.phone).toBe(payload.phone)
    let token = await Token.findOne({ user: USER1_ID })
    expect(token).not.toBeNull()
    expect(token?.token.length).toBeGreaterThan(0)

    const email = testHelper.GetRandomEmail()
    payload.email = email
    payload.avatar = `${uuid()}.jpg`
    res = await request(app)
      .post('/api/sign-up')
      .send(payload)
    expect(res.statusCode).toBe(200)
    user = await User.findOne({ email })
    expect(user).not.toBeNull()
    await user?.deleteOne()
    token = await Token.findOne({ user: user?._id })
    expect(token).not.toBeNull()
    expect(token?.token.length).toBeGreaterThan(0)
    await token?.deleteOne()

    res = await request(app)
      .post('/api/sign-up')
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/admin-sign-up', () => {
  it('should create an admin user', async () => {
    const payload: bookcarsTypes.SignUpPayload = {
      email: ADMIN_EMAIL,
      password: testHelper.PASSWORD,
      fullName: 'admin',
      language: testHelper.LANGUAGE,
      birthDate: new Date(1992, 5, 25),
      phone: '09090909',
    }

    const res = await request(app)
      .post('/api/admin-sign-up')
      .send(payload)

    expect(res.statusCode).toBe(200)

    const user = await User.findOne({ email: ADMIN_EMAIL })
    expect(user).not.toBeNull()
    ADMIN_ID = user?.id
    expect(user?.type).toBe(bookcarsTypes.UserType.Admin)
    expect(user?.email).toBe(payload.email)
    expect(user?.fullName).toBe(payload.fullName)
    expect(user?.language).toBe(payload.language)
    expect(user?.birthDate).toStrictEqual(payload.birthDate)
    expect(user?.phone).toBe(payload.phone)
    const token = await Token.findOne({ user: ADMIN_ID })
    expect(token).not.toBeNull()
    expect(token?.token.length).toBeGreaterThan(0)
  })
})

describe('POST /api/create-user', () => {
  it('should create a user', async () => {
    const token = await testHelper.signinAsAdmin()

    const tempAvatar = path.join(env.CDN_TEMP_USERS, AVATAR1)
    if (!await helper.exists(tempAvatar)) {
      fs.copyFile(AVATAR1_PATH, tempAvatar)
    }
    let payload: bookcarsTypes.CreateUserPayload = {
      email: USER2_EMAIL,
      fullName: 'user2',
      language: testHelper.LANGUAGE,
      birthDate: new Date(1992, 5, 25),
      phone: '09090909',
      location: 'location',
      bio: 'bio',
      avatar: AVATAR1,
    }
    let res = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    let user = await User.findOne({ email: USER2_EMAIL })
    expect(user).not.toBeNull()
    USER2_ID = user?.id
    expect(user?.type).toBe(bookcarsTypes.UserType.User)
    expect(user?.email).toBe(payload.email)
    expect(user?.fullName).toBe(payload.fullName)
    expect(user?.language).toBe(payload.language)
    expect(user?.birthDate).toStrictEqual(payload.birthDate)
    expect(user?.phone).toBe(payload.phone)
    expect(user?.location).toBe(payload.location)
    expect(user?.bio).toBe(payload.bio)
    let userToken = await Token.findOne({ user: USER2_ID })
    expect(userToken).not.toBeNull()
    expect(userToken?.token.length).toBeGreaterThan(0)
    await userToken?.deleteOne()

    payload = {
      email: testHelper.GetRandomEmail(),
      fullName: 'admin',
      language: testHelper.LANGUAGE,
      birthDate: new Date(1992, 5, 25),
      phone: '09090909',
      location: 'location',
      bio: 'bio',
      avatar: AVATAR1,
      type: bookcarsTypes.UserType.Admin,
    }
    res = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    user = await User.findOne({ email: payload.email })
    expect(user).not.toBeNull()
    expect(user?.type).toBe(payload.type)
    expect(user?.email).toBe(payload.email)
    expect(user?.fullName).toBe(payload.fullName)
    expect(user?.language).toBe(payload.language)
    expect(user?.birthDate).toStrictEqual(payload.birthDate)
    expect(user?.phone).toBe(payload.phone)
    expect(user?.location).toBe(payload.location)
    expect(user?.bio).toBe(payload.bio)
    await user?.deleteOne()
    userToken = await Token.findOne({ user: user?._id })
    expect(userToken).not.toBeNull()
    expect(userToken?.token.length).toBeGreaterThan(0)
    await userToken?.deleteOne()

    let email = testHelper.GetRandomEmail()
    payload.email = email
    payload.avatar = undefined
    res = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    user = await User.findOne({ email })
    expect(user).not.toBeNull()
    await user?.deleteOne()
    userToken = await Token.findOne({ user: user?._id })
    expect(userToken).not.toBeNull()
    expect(userToken?.token.length).toBeGreaterThan(0)
    await userToken?.deleteOne()

    payload.email = USER2_EMAIL
    payload.avatar = 'unknown.jpg'
    res = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    res = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    payload.avatar = AVATAR1
    email = testHelper.GetRandomEmail()
    payload.email = email
    payload.password = 'password'
    res = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const deleteRes = await User.deleteOne({ email })
    expect(deleteRes.deletedCount).toBe(1)

    await testHelper.signout(token)
  })
})

describe('GET /api/check-token/:type/:userId/:email/:token', () => {
  it("should check user's token", async () => {
    const user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    user!.active = false
    await user!.save()
    const userToken = await Token.findOne({ user: USER1_ID })
    expect(userToken).not.toBeNull()
    const token = userToken?.token
    expect(token?.length).toBeGreaterThan(1)

    let res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Frontend}/${USER1_ID}/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(200)

    res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Backend}/${USER1_ID}/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Frontend}/${USER2_ID}/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Frontend}/${testHelper.GetRandromObjectIdAsString()}/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Frontend}/${USER1_ID}/${USER1_EMAIL}/${uuid()}`)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Frontend}/0/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/activate', () => {
  it("should activate user's account", async () => {
    const userToken = await Token.findOne({ user: USER1_ID })
    expect(userToken).not.toBeNull()
    const token = userToken?.token
    expect(token?.length).toBeGreaterThan(1)

    const payload: bookcarsTypes.ActivatePayload = {
      userId: USER1_ID,
      password: testHelper.PASSWORD,
      token: token!,
    }
    let res = await request(app)
      .post('/api/activate')
      .send(payload)
    expect(res.statusCode).toBe(200)
    const user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.active).toBeTruthy()
    expect(user?.verified).toBeTruthy()

    payload.userId = USER2_ID
    res = await request(app)
      .post('/api/activate')
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload.userId = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/activate')
      .send(payload)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .post('/api/activate')
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/confirm-email/:email/:token', () => {
  it('should send confirmation email', async () => {
    let user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    user!.verified = false
    await user?.save()
    const userToken = await Token.findOne({ user: USER1_ID })
    expect(userToken).not.toBeNull()
    const token = userToken?.token
    expect(token?.length).toBeGreaterThan(1)
    let res = await request(app)
      .get(`/api/confirm-email/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(200)

    user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.verified).toBeTruthy()
    res = await request(app)
      .get(`/api/confirm-email/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(200)

    res = await request(app)
      .get(`/api/confirm-email/${testHelper.GetRandomEmail()}/${token}`)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get(`/api/confirm-email/${USER1_EMAIL}/${uuid()}`)
    expect(res.statusCode).toBe(400)

    res = await request(app)
      .get(`/api/confirm-email/unknown/${uuid()}`)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/resend/:type/:email/:reset', () => {
  it('should resend validation email', async () => {
    let user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    user!.active = true
    await user!.save()
    let reset = true
    let res = await request(app)
      .post(`/api/resend/${bookcarsTypes.AppType.Frontend}/${USER1_EMAIL}/${reset}`)
    expect(res.statusCode).toBe(200)
    user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.active).toBeFalsy()

    reset = false
    res = await request(app)
      .post(`/api/resend/${bookcarsTypes.AppType.Backend}/${ADMIN_EMAIL}/${reset}`)
    expect(res.statusCode).toBe(200)
    user = await User.findById(ADMIN_ID)
    expect(user).not.toBeNull()
    expect(user?.active).toBeFalsy()

    res = await request(app)
      .post(`/api/resend/${bookcarsTypes.AppType.Backend}/${USER1_EMAIL}/${reset}`)
    expect(res.statusCode).toBe(403)

    res = await request(app)
      .post(`/api/resend/${bookcarsTypes.AppType.Frontend}/${testHelper.GetRandomEmail()}/${reset}`)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .post(`/api/resend/${bookcarsTypes.AppType.Frontend}/unknown/${reset}`)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/resend-link', () => {
  it('should resend activation link', async () => {
    const token = await testHelper.signinAsAdmin()

    const payload: bookcarsTypes.ResendLinkPayload = {
      email: USER1_EMAIL,
    }

    let res = await request(app)
      .post('/api/resend-link')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    const user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    user!.verified = true
    await user?.save()
    res = await request(app)
      .post('/api/resend-link')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    payload.email = testHelper.GetRandomEmail()
    res = await request(app)
      .post('/api/resend-link')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    payload.email = USER1_EMAIL
    user!.verified = false
    await user?.save()
    res = await request(app)
      .post('/api/resend-link')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    payload.email = 'unknown'
    res = await request(app)
      .post('/api/resend-link')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('DELETE /api/delete-tokens/:userId', () => {
  it("should delete user's tokens", async () => {
    let userTokens = await Token.find({ user: USER1_ID })
    expect(userTokens.length).toBeGreaterThan(0)
    let res = await request(app)
      .delete(`/api/delete-tokens/${USER1_ID}`)
    expect(res.statusCode).toBe(200)
    userTokens = await Token.find({ user: USER1_ID })
    expect(userTokens.length).toBe(0)

    res = await request(app)
      .delete(`/api/delete-tokens/${USER1_ID}`)
    expect(res.statusCode).toBe(400)

    res = await request(app)
      .delete('/api/delete-tokens/0')
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/sign-in/:type', () => {
  it('should sign in', async () => {
    const payload: bookcarsTypes.SignInPayload = {
      email: USER1_EMAIL,
      password: USER1_PASSWORD,
    }

    let res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies.length).toBeGreaterThan(1)
    const token = testHelper.getToken(cookies[1])
    expect(token).toBeDefined()

    payload.password = 'wrong-password'
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload.password = USER1_PASSWORD
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Backend}`)
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload.stayConnected = true
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(200)

    payload.stayConnected = false
    payload.mobile = true
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(200)

    payload.email = 'unknown'
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/sign-out', () => {
  it('should sign out', async () => {
    const res = await request(app)
      .post('/api/sign-out')
      .set('Cookie', [`${env.X_ACCESS_TOKEN}=${uuid()};`])

    expect(res.statusCode).toBe(200)
    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies.length).toBe(1)
    expect(cookies[0]).toContain(`${env.X_ACCESS_TOKEN}=;`)
  })
})

describe('POST /api/create-push-token/:userId/:token', () => {
  it('should create push token', async () => {
    const token = await testHelper.signinAsAdmin()

    let pushToken = uuid()
    let res = await request(app)
      .post(`/api/create-push-token/${USER1_ID}/${pushToken}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    let pushNotifiation = await PushToken.findOne({ user: USER1_ID, token: pushToken })
    expect(pushNotifiation).not.toBeNull()

    pushToken = uuid()
    res = await request(app)
      .post(`/api/create-push-token/${USER1_ID}/${pushToken}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)
    pushNotifiation = await PushToken.findOne({ user: USER1_ID, token: pushToken })
    expect(pushNotifiation).toBeNull()

    res = await request(app)
      .post(`/api/create-push-token/0/${pushToken}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/push-token/:userId', () => {
  it('should get push token', async () => {
    const token = await testHelper.signinAsAdmin()

    let res = await request(app)
      .get(`/api/push-token/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(1)

    res = await request(app)
      .get(`/api/push-token/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get('/api/push-token/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-push-token/:userId', () => {
  it('should delete push token', async () => {
    const token = await testHelper.signinAsAdmin()

    let pushNotifiations = await PushToken.find({ user: USER1_ID })
    expect(pushNotifiations.length).toBeGreaterThan(0)
    let res = await request(app)
      .post(`/api/delete-push-token/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    pushNotifiations = await PushToken.find({ user: USER1_ID })
    expect(pushNotifiations.length).toBe(0)

    res = await request(app)
      .post('/api/delete-push-token/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/validate-email', () => {
  it('should validate email', async () => {
    const payload: bookcarsTypes.ValidateEmailPayload = {
      email: USER1_EMAIL,
    }
    let res = await request(app)
      .post('/api/validate-email')
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload.email = testHelper.GetRandomEmail()
    res = await request(app)
      .post('/api/validate-email')
      .send(payload)
    expect(res.statusCode).toBe(200)

    payload.email = 'unkown'
    res = await request(app)
      .post('/api/validate-email')
      .send(payload)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/validate-access-token', () => {
  it('should validate access token', async () => {
    const token = await testHelper.signinAsAdmin()

    let res = await request(app)
      .post('/api/validate-access-token')
      .set(env.X_ACCESS_TOKEN, token)

    expect(res.statusCode).toBe(200)

    res = await request(app)
      .post('/api/validate-access-token')
      .set(env.X_ACCESS_TOKEN, uuid())

    expect(res.statusCode).toBe(401)

    await testHelper.signout(token)

    res = await request(app)
      .post('/api/validate-access-token')

    expect(res.statusCode).toBe(403)
  })
})

describe('POST /api/update-user', () => {
  it('should update user', async () => {
    const token = await testHelper.signinAsAdmin()

    const payload: bookcarsTypes.UpdateUserPayload = {
      _id: USER1_ID,
      fullName: 'user1-1',
      birthDate: new Date(1993, 5, 25),
      phone: '09090908',
      location: 'location1-1',
      bio: 'bio1-1',
      type: bookcarsTypes.UserType.Supplier,
      payLater: false,
    }
    let res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    let user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.type).toBe(bookcarsTypes.UserType.Supplier)
    expect(user?.fullName).toBe(payload.fullName)
    expect(user?.birthDate).toStrictEqual(payload.birthDate)
    expect(user?.phone).toBe(payload.phone)
    expect(user?.location).toBe(payload.location)
    expect(user?.bio).toBe(payload.bio)
    expect(user?.payLater).toBeFalsy()

    const { fullName, payLater } = (user!)
    payload!.fullName = ''
    payload!.birthDate = undefined
    payload!.type = undefined
    payload.payLater = undefined
    res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.type).toBe(bookcarsTypes.UserType.Supplier)
    expect(user?.fullName).toBe(fullName)
    expect(user?.birthDate).toBeUndefined()
    expect(user?.phone).toBe(payload.phone)
    expect(user?.location).toBe(payload.location)
    expect(user?.bio).toBe(payload.bio)
    expect(user?.payLater).toBe(payLater)

    payload._id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload._id = USER1_ID
    payload.enableEmailNotifications = false
    res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.enableEmailNotifications).toBeFalsy()

    payload._id = '0'
    res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/update-email-notifications', () => {
  it('should update email notifications setting', async () => {
    const token = await testHelper.signinAsAdmin()

    let user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.enableEmailNotifications).toBeFalsy()
    const payload: bookcarsTypes.UpdateEmailNotificationsPayload = {
      _id: USER1_ID,
      enableEmailNotifications: true,
    }
    let res = await request(app)
      .post('/api/update-email-notifications')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.enableEmailNotifications).toBeTruthy()

    payload._id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/update-email-notifications')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload._id = '0'
    res = await request(app)
      .post('/api/update-email-notifications')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/update-language', () => {
  it("should update user's language", async () => {
    const token = await testHelper.signinAsAdmin()

    let user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.language).toBe(testHelper.LANGUAGE)
    const payload: bookcarsTypes.UpdateLanguagePayload = {
      id: USER1_ID,
      language: 'fr',
    }
    let res = await request(app)
      .post('/api/update-language')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.language).toBe(payload.language)

    payload.id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/update-language')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload.id = '0'
    res = await request(app)
      .post('/api/update-language')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/user/:id', () => {
  it('should get a user', async () => {
    const token = await testHelper.signinAsAdmin()

    let res = await request(app)
      .get(`/api/user/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.email).toBe(USER1_EMAIL)

    res = await request(app)
      .get(`/api/user/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get('/api/user/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/create-avatar', () => {
  it("should create user's avatar", async () => {
    const token = await testHelper.signinAsAdmin()

    let res = await request(app)
      .post('/api/create-avatar')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', AVATAR1_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    const filePath = path.resolve(env.CDN_TEMP_USERS, filename)
    const avatarExists = await helper.exists(filePath)
    expect(avatarExists).toBeTruthy()
    await fs.unlink(filePath)

    res = await request(app)
      .post('/api/create-avatar')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/update-avatar/:userId', () => {
  it("should update user's avatar", async () => {
    const token = await testHelper.signinAsAdmin()

    let res = await request(app)
      .post(`/api/update-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', AVATAR2_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    let avatarExists = await helper.exists(path.resolve(env.CDN_USERS, filename))
    expect(avatarExists).toBeTruthy()
    const user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.avatar).toBeDefined()
    expect(user?.avatar).not.toBeNull()

    user!.avatar = `${uuid()}.jpg`
    await user?.save()
    res = await request(app)
      .post(`/api/update-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', AVATAR2_PATH)
    expect(res.statusCode).toBe(200)
    avatarExists = await helper.exists(path.resolve(env.CDN_USERS, filename))
    expect(avatarExists).toBeTruthy()

    user!.avatar = undefined
    await user?.save()
    res = await request(app)
      .post(`/api/update-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', AVATAR2_PATH)
    expect(res.statusCode).toBe(200)
    avatarExists = await helper.exists(path.resolve(env.CDN_USERS, filename))
    expect(avatarExists).toBeTruthy()

    res = await request(app)
      .post(`/api/update-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    res = await request(app)
      .post(`/api/update-avatar/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', AVATAR2_PATH)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .post('/api/update-avatar/0')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', AVATAR2_PATH)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-avatar/:userId', () => {
  it("should delete user's avatar", async () => {
    const token = await testHelper.signinAsAdmin()

    let user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.avatar).toBeDefined()
    expect(user?.avatar).not.toBeNull()
    const filePath = path.join(env.CDN_USERS, user?.avatar as string)
    let avatarExists = await helper.exists(filePath)
    expect(avatarExists).toBeTruthy()
    let res = await request(app)
      .post(`/api/delete-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    avatarExists = await helper.exists(filePath)
    expect(avatarExists).toBeFalsy()
    user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.avatar).toBeUndefined()

    user!.avatar = `${uuid()}.jpg`
    await user?.save()
    res = await request(app)
      .post(`/api/delete-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    user!.avatar = undefined
    await user?.save()
    res = await request(app)
      .post(`/api/delete-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    res = await request(app)
      .post(`/api/delete-avatar/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .post('/api/delete-avatar/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-temp-avatar/:avatar', () => {
  it('should delete temporary avatar', async () => {
    const token = await testHelper.signinAsAdmin()

    const tempAvatar = path.join(env.CDN_TEMP_USERS, AVATAR1)
    if (!await helper.exists(tempAvatar)) {
      fs.copyFile(AVATAR1_PATH, tempAvatar)
    }
    let res = await request(app)
      .post(`/api/delete-temp-avatar/${AVATAR1}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    const tempImageExists = await helper.exists(tempAvatar)
    expect(tempImageExists).toBeFalsy()

    res = await request(app)
      .post('/api/delete-temp-avatar/unknown.jpg')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/change-password', () => {
  it('should change password', async () => {
    const token = await testHelper.signinAsAdmin()

    const newPassword = `#${testHelper.PASSWORD}#`

    const payload: bookcarsTypes.ChangePasswordPayload = {
      _id: USER1_ID,
      password: USER1_PASSWORD,
      newPassword,
      strict: true,
    }
    let res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    payload.password = newPassword
    payload.newPassword = USER1_PASSWORD
    payload.strict = false
    res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    payload.strict = true
    payload.password = ''
    res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload.password = 'wrong-password'
    res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload._id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    const user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    const password = user?.password
    user!.password = undefined
    await user?.save()
    payload._id = USER1_ID
    res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)
    user!.password = password
    await user?.save()

    payload._id = '0'
    res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/check-password/:id/:password', () => {
  it('should check password', async () => {
    const token = await testHelper.signinAsAdmin()

    // good password
    let res = await request(app)
      .get(`/api/check-password/${USER1_ID}/${encodeURIComponent(USER1_PASSWORD)}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // wrong password
    res = await request(app)
      .get(`/api/check-password/${USER1_ID}/wrong-password`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // user.password undefined
    res = await request(app)
      .get(`/api/check-password/${USER2_ID}/some-password`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // user not found
    res = await request(app)
      .get(`/api/check-password/${testHelper.GetRandromObjectIdAsString()}/some-password`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // wrong user id
    res = await request(app)
      .get('/api/check-password/0/some-password')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/users/:page/:size', () => {
  it('should get users', async () => {
    const token = await testHelper.signinAsAdmin()

    const payload: bookcarsTypes.GetUsersBody = {
      user: testHelper.getAdminUserId(),
      types: [bookcarsTypes.UserType.Admin, bookcarsTypes.UserType.Supplier, bookcarsTypes.UserType.User],
    }
    let res = await request(app)
      .post(`/api/users/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(3)

    payload.user = ''
    res = await request(app)
      .post(`/api/users/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(3)

    res = await request(app)
      .post(`/api/users/unknown/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-users', () => {
  it('should delete users', async () => {
    const token = await testHelper.signinAsAdmin()

    let payload: string[] = [USER1_ID, USER2_ID, ADMIN_ID]
    const user1 = await User.findById(USER1_ID)
    user1!.avatar = `${uuid()}.jpg`
    await user1?.save()
    let users = await User.find({ _id: { $in: payload } })
    expect(users.length).toBe(3)
    let res = await request(app)
      .post('/api/delete-users')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    users = await User.find({ _id: { $in: payload } })
    expect(users.length).toBe(0)

    payload = [testHelper.GetRandromObjectIdAsString()]
    res = await request(app)
      .post('/api/delete-users')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    const supplierName = testHelper.getSupplierName()
    const supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    const locationId = await testHelper.createLocation('Location 1 EN', 'Location 1 FR')
    const imageName = 'bmw-x1.jpg'
    const imagePath = path.resolve(__dirname, `./img/${imageName}`)
    const image = path.join(env.CDN_CARS, imageName)
    if (!await helper.exists(image)) {
      fs.copyFile(imagePath, image)
    }
    let car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      price: 780,
      deposit: 9500,
      available: false,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      image: imageName,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 90,
      collisionDamageWaiver: 120,
      fullInsurance: 200,
      additionalDriver: 200,
    })
    await car.save()
    car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      price: 780,
      deposit: 9500,
      available: false,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      image: undefined,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 90,
      collisionDamageWaiver: 120,
      fullInsurance: 200,
      additionalDriver: 200,
    })
    await car.save()
    car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      price: 780,
      deposit: 9500,
      available: false,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      image: `${uuid()}.jpg`,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 90,
      collisionDamageWaiver: 120,
      fullInsurance: 200,
      additionalDriver: 200,
    })
    await car.save()
    const additionalDriver = new AdditionalDriver({
      email: testHelper.GetRandomEmail(),
      fullName: 'additional-driver',
      phone: '01010101',
      birthDate: new Date(1990, 2, 3),
    })
    await additionalDriver.save()
    const booking = new Booking({
      supplier: supplierId,
      car: car._id,
      driver: USER1_ID,
      pickupLocation: locationId,
      dropOffLocation: locationId,
      from: new Date(2024, 2, 1),
      to: new Date(1990, 2, 4),
      status: bookcarsTypes.BookingStatus.Pending,
      cancellation: true,
      amendments: true,
      theftProtection: false,
      collisionDamageWaiver: false,
      fullInsurance: false,
      price: 312,
      additionalDriver: true,
      _additionalDriver: additionalDriver._id,
    })
    await booking.save()
    payload = [supplierId]
    res = await request(app)
      .post('/api/delete-users')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const ad = await AdditionalDriver.findById(additionalDriver._id)
    expect(ad).toBeNull()
    const b = await Booking.findById(booking._id)
    expect(b).toBeNull()
    const c = await Car.findById(car._id)
    expect(c).toBeNull()
    const s = await User.findById(supplierId)
    expect(s).toBeNull()
    expect(await helper.exists(image)).toBeFalsy()
    testHelper.deleteLocation(locationId)

    res = await request(app)
      .post('/api/delete-users')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})
