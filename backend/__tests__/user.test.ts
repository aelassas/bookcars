import 'dotenv/config'
import { jest } from '@jest/globals'
import request from 'supertest'
import url from 'url'
import path from 'path'
import asyncFs from 'node:fs/promises'
import { nanoid } from 'nanoid'
import bcrypt from 'bcrypt'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import * as helper from '../src/utils/helper'
import * as authHelper from '../src/utils/authHelper'
import * as env from '../src/config/env.config'
import User from '../src/models/User'
import Token from '../src/models/Token'
import PushToken from '../src/models/PushToken'
import Car from '../src/models/Car'
import Booking from '../src/models/Booking'
import AdditionalDriver from '../src/models/AdditionalDriver'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const AVATAR1 = 'avatar1.jpg'
const AVATAR1_PATH = path.join(__dirname, `./img/${AVATAR1}`)
const AVATAR2 = 'avatar2.png'
const AVATAR2_PATH = path.join(__dirname, `./img/${AVATAR2}`)

const CONTRACT1 = 'contract1.pdf'
const CONTRACT1_PATH = path.join(__dirname, `./contracts/${CONTRACT1}`)

const LICENSE1 = 'contract1.pdf'
const LICENSE1_PATH = path.join(__dirname, `./contracts/${LICENSE1}`)
const LICENSE2 = 'contract2.pdf'
const LICENSE2_PATH = path.join(__dirname, `./contracts/${LICENSE2}`)

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

  await databaseHelper.connect(env.DB_URI, false, false)
  await testHelper.initialize()
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  await testHelper.close()

  await Token.deleteMany({ user: { $in: [ADMIN_ID] } })

  await databaseHelper.close()
})

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
})

//
// Unit tests
//

describe('POST /api/sign-up', () => {
  it('should create a user', async () => {
    // init
    const tempAvatar = path.join(env.CDN_TEMP_USERS, AVATAR1)
    if (!(await helper.pathExists(tempAvatar))) {
      await asyncFs.copyFile(AVATAR1_PATH, tempAvatar)
    }

    // test success (with avatar)
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
    USER1_ID = user?._id.toString() || ''
    expect(user?.type).toBe(bookcarsTypes.UserType.User)
    expect(user?.email).toBe(payload.email)
    expect(user?.fullName).toBe(payload.fullName)
    expect(user?.language).toBe(payload.language)
    expect(user?.birthDate).toStrictEqual(payload.birthDate)
    expect(user?.phone).toBe(payload.phone)
    let token = await Token.findOne({ user: USER1_ID })
    expect(token).not.toBeNull()
    expect(token?.token.length).toBeGreaterThan(0)

    // A duplicate signup has the same public response as a new signup.
    res = await request(app)
      .post('/api/sign-up')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.text).toBe('OK')
    expect(await User.countDocuments({ email: USER1_EMAIL })).toBe(1)

    // test success (avatar not found)
    const email = testHelper.GetRandomEmail()
    payload.email = email
    payload.avatar = `${nanoid()}.jpg`
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

    // test failure (wrong email)
    payload.email = 'wrong-email'
    res = await request(app)
      .post('/api/sign-up')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (no payload)
    res = await request(app)
      .post('/api/sign-up')
    expect(res.statusCode).toBe(400)

    // test failure (smtp failed)
    payload.email = testHelper.GetRandomEmail()
    // Mock mailHelper to simulate an error
    jest.unstable_mockModule('../src/utils/mailHelper.js', () => ({
      sendMail: jest.fn(() => Promise.reject(new Error('SMTP failed')))
    }))

    jest.resetModules()
    await jest.isolateModulesAsync(async () => {
      const env = await import('../src/config/env.config.js')
      const newApp = (await import('../src/app.js')).default
      const dbh = await import('../src/utils/databaseHelper.js')

      await dbh.close()
      await dbh.connect(env.DB_URI, false, false)

      res = await request(newApp)
        .post('/api/sign-up')
        .send(payload)
      expect(res.statusCode).toBe(200)
      expect(res.text).toBe('OK')
      user = await User.findOne({ email: payload.email })
      expect(user).toBeFalsy()
      await dbh.close()
    })

    jest.unstable_mockModule('../src/utils/mailHelper.js', () => ({
      sendMail: jest.fn(() => Promise.reject(new Error('SMTP failed'))),
    }))

    jest.resetModules()

    await jest.isolateModulesAsync(async () => {
      const env = await import('../src/config/env.config.js')
      const User = (await import('../src/models/User.js')).default
      const newApp = (await import('../src/app.js')).default
      const dbh = await import('../src/utils/databaseHelper.js')

      await dbh.close()
      await dbh.connect(env.DB_URI, false, false)

      // Create a mock user model with failing deleteOne
      const email = testHelper.GetRandomEmail()

      // Mock deleteOne to fail
      const deleteOneMock = jest
        .spyOn(User.prototype, 'deleteOne')
        .mockImplementation(() => Promise.reject(new Error('deleteOne failed')))

      const payload = {
        fullName: 'user',
        email,
        language: testHelper.LANGUAGE,
        password: USER1_PASSWORD,
        birthDate: new Date(1992, 5, 25),
        phone: '09090909',
      }

      res = await request(newApp)
        .post('/api/sign-up')
        .send(payload)
      expect(res.statusCode).toBe(200)
      expect(deleteOneMock).toHaveBeenCalled()
      deleteOneMock.mockRestore()
      await User.deleteOne({ email })
      const deletedUser = await User.findOne({ email })
      expect(deletedUser).toBeNull()
      await dbh.close()
    })
  })
})

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('POST /api/admin-sign-up', () => {
  it('should create an admin user', async () => {
    // test success
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
    ADMIN_ID = user?._id.toString() || ''
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

    // init
    const tempAvatar = path.join(env.CDN_TEMP_USERS, AVATAR1)
    if (!(await helper.pathExists(tempAvatar))) {
      await asyncFs.copyFile(AVATAR1_PATH, tempAvatar)
    }
    const tempLicense = path.join(env.CDN_TEMP_LICENSES, LICENSE1)
    if (!(await helper.pathExists(tempLicense))) {
      await asyncFs.copyFile(LICENSE1_PATH, tempLicense)
    }

    const contractFileName = `${nanoid()}.pdf`
    const contractFile = path.join(env.CDN_TEMP_CONTRACTS, contractFileName)
    if (!(await helper.pathExists(contractFile))) {
      await asyncFs.copyFile(CONTRACT1_PATH, contractFile)
    }
    const contracts = [
      { language: 'en', file: contractFileName },
      { language: 'fr', file: null },
      { language: 'es', file: `${nanoid()}.pdf` },
    ]

    // test success (user)
    let payload: bookcarsTypes.CreateUserPayload = {
      email: USER2_EMAIL,
      fullName: 'user2',
      language: testHelper.LANGUAGE,
      birthDate: new Date(1992, 5, 25),
      phone: '09090909',
      location: 'location',
      bio: 'bio',
      avatar: AVATAR1,
      license: LICENSE1,
      contracts,
    }
    let res = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    let user = await User.findOne({ email: USER2_EMAIL })
    expect(user).not.toBeNull()
    USER2_ID = user?._id.toString() || ''
    expect(user?.type).toBe(bookcarsTypes.UserType.User)
    expect(user?.email).toBe(payload.email)
    expect(user?.fullName).toBe(payload.fullName)
    expect(user?.language).toBe(payload.language)
    expect(user?.birthDate).toStrictEqual(payload.birthDate)
    expect(user?.phone).toBe(payload.phone)
    expect(user?.location).toBe(payload.location)
    expect(user?.bio).toBe(payload.bio)
    const contractFileResult = user?.contracts?.find((c) => c.language === 'en')?.file
    expect(contractFileResult).toBeTruthy()
    expect(await helper.pathExists(path.join(env.CDN_CONTRACTS, contractFileResult!))).toBeTruthy()
    let userToken = await Token.findOne({ user: USER2_ID })
    expect(userToken).not.toBeNull()
    expect(userToken?.token.length).toBeGreaterThan(0)
    await userToken?.deleteOne()

    // test success (supplier)
    payload = {
      email: testHelper.GetRandomEmail(),
      fullName: 'supplier',
      language: testHelper.LANGUAGE,
      birthDate: new Date(1992, 5, 25),
      phone: '09090909',
      location: 'location',
      bio: 'bio',
      avatar: AVATAR1,
      type: bookcarsTypes.UserType.Supplier,
      licenseRequired: true,
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
    expect(user?.licenseRequired).toBeTruthy()
    await user?.deleteOne()
    userToken = await Token.findOne({ user: user?._id })
    expect(userToken).not.toBeNull()
    expect(userToken?.token.length).toBeGreaterThan(0)
    await userToken?.deleteOne()

    // test success (admin)
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

    // test success (without avatar and license)
    let email = testHelper.GetRandomEmail()
    payload.email = email
    payload.type = bookcarsTypes.UserType.User
    payload.avatar = undefined
    payload.license = undefined
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

    // test success (avatar and license not found)
    email = testHelper.GetRandomEmail()
    payload.email = email
    payload.avatar = `${nanoid()}.jpg`
    payload.license = `${nanoid()}.pdf`
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

    // test failure (user already exists)
    payload.email = USER2_EMAIL
    // payload.avatar = `${nanoid()}.jpg`
    // payload.license = `${nanoid()}.pdf`
    res = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (no payload)
    res = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test success (with avatar)
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

describe('POST /api/create-user authorization', () => {
  const supplierPassword = 'Synthetic-User-Creation-Password!'
  const supplierEmail = testHelper.GetRandomEmail()
  const adminAllowedCandidateEmails = [
    testHelper.GetRandomEmail(),
    testHelper.GetRandomEmail(),
    testHelper.GetRandomEmail(),
  ]
  const adminCandidateEmail = testHelper.GetRandomEmail()
  const supplierCandidateEmail = testHelper.GetRandomEmail()
  const foreignCandidateEmail = testHelper.GetRandomEmail()
  const driverCandidateEmail = testHelper.GetRandomEmail()
  const invalidRoleCandidateEmail = testHelper.GetRandomEmail()
  let supplierId: string

  beforeAll(async () => {
    supplierId = await testHelper.createSupplier(supplierEmail, 'User Creation Test Supplier')
  })

  afterAll(async () => {
    await User.deleteMany({
      email: {
        $in: [
          ...adminAllowedCandidateEmails,
          adminCandidateEmail,
          supplierCandidateEmail,
          foreignCandidateEmail,
          driverCandidateEmail,
          invalidRoleCandidateEmail,
        ],
      },
    })
    if (supplierId) {
      await testHelper.deleteSupplier(supplierId)
    }
  })

  const createPayload = (email: string, type?: string, supplier?: string): bookcarsTypes.CreateUserPayload => ({
    email,
    fullName: 'Synthetic User Creation Candidate',
    language: testHelper.LANGUAGE,
    phone: '',
    location: '',
    bio: '',
    password: supplierPassword,
    type,
    supplier,
  })

  it('restricts supplier-created roles and binds permitted users to the authenticated supplier', async () => {
    const supplierToken = await testHelper.generateToken(supplierId)

    let response = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, supplierToken)
      .send(createPayload(adminCandidateEmail, bookcarsTypes.UserType.Admin))
    expect(response.statusCode).toBe(403)
    expect(await User.findOne({ email: adminCandidateEmail })).toBeNull()

    response = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, supplierToken)
      .send(createPayload(supplierCandidateEmail, bookcarsTypes.UserType.Supplier))
    expect(response.statusCode).toBe(403)
    expect(await User.findOne({ email: supplierCandidateEmail })).toBeNull()

    response = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, supplierToken)
      .send(createPayload(foreignCandidateEmail, bookcarsTypes.UserType.User, testHelper.GetRandromObjectIdAsString()))
    expect(response.statusCode).toBe(403)
    expect(await User.findOne({ email: foreignCandidateEmail })).toBeNull()

    response = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, supplierToken)
      .send(createPayload(driverCandidateEmail, bookcarsTypes.UserType.User))
    expect(response.statusCode).toBe(200)
    const driver = await User.findOne({ email: driverCandidateEmail })
    expect(driver).not.toBeNull()
    expect(driver?.type).toBe(bookcarsTypes.UserType.User)
    expect(driver?.supplier?.toString()).toBe(supplierId)
    expect(driver?.password).not.toBe(supplierPassword)
    expect(await bcrypt.compare(supplierPassword, driver!.password!)).toBe(true)

    response = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, supplierToken)
      .send(createPayload(invalidRoleCandidateEmail, 'super-admin'))
    expect(response.statusCode).toBe(400)
    expect(await User.findOne({ email: invalidRoleCandidateEmail })).toBeNull()
  })

  it('rejects ordinary, unauthenticated, and invalid-token callers', async () => {
    const payload = createPayload(testHelper.GetRandomEmail(), bookcarsTypes.UserType.User)
    const userToken = await testHelper.generateToken(testHelper.getUserId())

    const ordinaryUserResponse = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, userToken)
      .send(payload)
    expect(ordinaryUserResponse.statusCode).toBe(403)

    const unauthenticatedResponse = await request(app)
      .post('/api/create-user')
      .send(payload)
    expect(unauthenticatedResponse.statusCode).toBe(403)

    const invalidTokenResponse = await request(app)
      .post('/api/create-user')
      .set(env.X_ACCESS_TOKEN, 'invalid-synthetic-token')
      .send(payload)
    expect(invalidTokenResponse.statusCode).toBe(401)
  })

  it('allows an authenticated Admin to create an allowed account type', async () => {
    const adminToken = await testHelper.signinAsAdmin()
    const allowedTypes = [bookcarsTypes.UserType.User, bookcarsTypes.UserType.Supplier, bookcarsTypes.UserType.Admin]

    for (const [index, type] of allowedTypes.entries()) {
      const email = adminAllowedCandidateEmails[index]
      const response = await request(app)
        .post('/api/create-user')
        .set(env.X_ACCESS_TOKEN, adminToken)
        .send(createPayload(email, type))

      expect(response.statusCode).toBe(200)
      const createdUser = await User.findOne({ email })
      expect(createdUser).not.toBeNull()
      expect(createdUser?.type).toBe(type)
      expect(createdUser?.password).not.toBe(supplierPassword)
      expect(await bcrypt.compare(supplierPassword, createdUser!.password!)).toBe(true)
    }

    await testHelper.signout(adminToken)
  })
})

describe('GET /api/check-token/:type/:userId/:email/:token', () => {
  it("should check user's token", async () => {
    // init
    const user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    user!.active = false
    await user!.save()
    const userToken = await Token.findOne({ user: USER1_ID })
    expect(userToken).not.toBeNull()
    const token = userToken?.token
    expect(token?.length).toBeGreaterThan(1)

    // test success (token valid)
    let res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Frontend}/${USER1_ID}/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(200)

    // test success (token not valid)
    res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Admin}/${USER1_ID}/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(204)

    // test success (token not found)
    res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Frontend}/${USER2_ID}/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(204)

    // test success (user not found)
    res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Frontend}/${testHelper.GetRandromObjectIdAsString()}/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(204)

    // test success (token not found)
    res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Frontend}/${USER1_ID}/${USER1_EMAIL}/${nanoid()}`)
    expect(res.statusCode).toBe(204)

    // test failure (wrong user id)
    res = await request(app)
      .get(`/api/check-token/${bookcarsTypes.AppType.Frontend}/0/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/activate', () => {
  it("should activate user's account", async () => {
    // init
    const userToken = await Token.findOne({ user: USER1_ID })
    expect(userToken).not.toBeNull()
    const token = userToken?.token
    expect(token?.length).toBeGreaterThan(1)

    // test success
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

    // test success (token not found)
    payload.userId = USER2_ID
    res = await request(app)
      .post('/api/activate')
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test success (user not found)
    payload.userId = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/activate')
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test failure (wrong id)
    payload.userId = '0'
    res = await request(app)
      .post('/api/activate')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (no payload)
    res = await request(app)
      .post('/api/activate')
    expect(res.statusCode).toBe(500)
  })
})

describe('GET /api/confirm-email/:email/:token', () => {
  it('should send confirmation email', async () => {
    // test success (user not verified)
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

    // test success (user verified)
    user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.verified).toBeTruthy()
    res = await request(app)
      .get(`/api/confirm-email/${USER1_EMAIL}/${token}`)
    expect(res.statusCode).toBe(200)

    // test success (user not found)
    res = await request(app)
      .get(`/api/confirm-email/${testHelper.GetRandomEmail()}/${token}`)
    expect(res.statusCode).toBe(204)

    // test failure (wrong token)
    res = await request(app)
      .get(`/api/confirm-email/${USER1_EMAIL}/${nanoid()}`)
    expect(res.statusCode).toBe(400)

    // test failure (wrong user id)
    res = await request(app)
      .get(`/api/confirm-email/unknown/${nanoid()}`)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/resend/:type/:email/:reset', () => {
  it('returns the same response for existing and missing accounts without sending real email', async () => {
    jest.unstable_mockModule('../src/utils/mailHelper.js', () => ({
      sendMail: jest.fn(async () => ({})),
    }))

    jest.resetModules()
    await jest.isolateModulesAsync(async () => {
      const env = await import('../src/config/env.config.js')
      const newApp = (await import('../src/app.js')).default
      const User = (await import('../src/models/User.js')).default
      const dbh = await import('../src/utils/databaseHelper.js')

      await dbh.close()
      await dbh.connect(env.DB_URI, false, false)

      const reset = true
      const existing = await request(newApp)
        .post(`/api/resend/${bookcarsTypes.AppType.Frontend}/${USER1_EMAIL}/${reset}`)
      const missing = await request(newApp)
        .post(`/api/resend/${bookcarsTypes.AppType.Frontend}/${testHelper.GetRandomEmail()}/${reset}`)
      const wrongType = await request(newApp)
        .post(`/api/resend/${bookcarsTypes.AppType.Admin}/${USER1_EMAIL}/${reset}`)

      expect(existing.statusCode).toBe(200)
      expect(missing.statusCode).toBe(existing.statusCode)
      expect(missing.text).toBe(existing.text)
      expect(wrongType.statusCode).toBe(existing.statusCode)
      expect(wrongType.text).toBe(existing.text)

      const user = await User.findById(USER1_ID)
      expect(user?.active).toBeFalsy()

      const malformed = await request(newApp)
        .post(`/api/resend/${bookcarsTypes.AppType.Frontend}/unknown/${reset}`)
      expect(malformed.statusCode).toBe(400)

      await dbh.close()
    })
  })
})

describe('POST /api/resend-link', () => {
  it('should resend activation link', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const payload: bookcarsTypes.ResendLinkPayload = {
      email: USER1_EMAIL,
    }
    let res = await request(app)
      .post('/api/resend-link')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    // test success (already verified)
    const user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    user!.verified = true
    await user!.save()
    res = await request(app)
      .post('/api/resend-link')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    // test failure (user not found)
    payload.email = testHelper.GetRandomEmail()
    res = await request(app)
      .post('/api/resend-link')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test success (not verified)
    payload.email = USER1_EMAIL
    user!.verified = false
    await user?.save()
    res = await request(app)
      .post('/api/resend-link')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    // test failure (wrong email)
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
    // test success
    let userTokens = await Token.find({ user: USER1_ID })
    expect(userTokens.length).toBeGreaterThan(0)
    let res = await request(app)
      .delete(`/api/delete-tokens/${USER1_ID}`)
    expect(res.statusCode).toBe(200)
    userTokens = await Token.find({ user: USER1_ID })
    expect(userTokens.length).toBe(0)

    // test failure (no token found)
    res = await request(app)
      .delete(`/api/delete-tokens/${USER1_ID}`)
    expect(res.statusCode).toBe(400)

    // test failure (wrong user id)
    res = await request(app)
      .delete('/api/delete-tokens/0')
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/sign-in/:type', () => {
  it('should sign in', async () => {
    // test success
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

    // test failure (email not found)
    payload.email = ''
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(400)
    payload.email = USER1_EMAIL

    // test success (wrong password)
    payload.password = 'wrong-password'
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test success (not authorized)
    payload.password = USER1_PASSWORD
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Admin}`)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test success (stayConnected)
    payload.stayConnected = true
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(200)

    // test success (mobile)
    payload.stayConnected = false
    payload.mobile = true
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(200)

    // test failure (wrong email)
    payload.email = 'unknown'
    res = await request(app)
      .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
      .send(payload)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/social-sign-in/:type', () => {
  it('should sign in', async () => {
    // test failure (google)
    const payload: bookcarsTypes.SignInPayload = {
      email: USER1_EMAIL,
      socialSignInType: bookcarsTypes.SocialSignInType.Google,
      accessToken: testHelper.GetRandromObjectIdAsString(),
    }
    let res = await request(app)
      .post('/api/social-sign-in')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (facebook)
    payload.socialSignInType = bookcarsTypes.SocialSignInType.Facebook
    res = await request(app)
      .post('/api/social-sign-in')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (apple)
    payload.socialSignInType = bookcarsTypes.SocialSignInType.Apple
    res = await request(app)
      .post('/api/social-sign-in')
      .send(payload)
    expect(res.statusCode).toBe(400)

    await jest.isolateModulesAsync(async () => {
      jest.unstable_mockModule('axios', () => ({
        default: {
          get: jest.fn(() => Promise.resolve({ data: { success: true } })),
        },
      }))
      const realHelper = await import('../src/utils/authHelper.js')
      jest.unstable_mockModule('../src/utils/authHelper.js', () => ({
        validateAccessToken: jest.fn(() => Promise.resolve(true)),
        encryptJWT: jest.fn(realHelper.encryptJWT),
        decryptJWT: jest.fn(realHelper.decryptJWT),
        isAdmin: jest.fn(realHelper.isAdmin),
        isFrontend: jest.fn(realHelper.isFrontend),
        hashPassword: jest.fn(realHelper.hashPassword)
      }))
      jest.resetModules()
      const env = await import('../src/config/env.config.js')
      const newApp = (await import('../src/app.js')).default
      const dbh = await import('../src/utils/databaseHelper.js')

      await dbh.close()
      await dbh.connect(env.DB_URI, false, false)
      // test success (mobile)
      payload.mobile = true
      res = await request(newApp)
        .post('/api/social-sign-in')
        .send(payload)
      expect(res.statusCode).toBe(200)

      // test success (mobile stay connected)
      payload.mobile = true
      payload.stayConnected = true
      res = await request(newApp)
        .post('/api/social-sign-in')
        .send(payload)
      expect(res.statusCode).toBe(200)

      // test success (mobile new user)
      payload.email = testHelper.GetRandomEmail()
      payload.fullName = 'Random user'
      res = await request(newApp)
        .post('/api/social-sign-in')
        .send(payload)
      expect(res.statusCode).toBe(200)
      await User.deleteOne({ email: payload.email })
      payload.mobile = false
      await dbh.close()
    })

    // test failure (no email)
    payload.email = undefined
    res = await request(app)
      .post('/api/social-sign-in')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (email not valid)
    payload.email = 'not-valid-email'
    res = await request(app)
      .post('/api/social-sign-in')
      .send(payload)
    expect(res.statusCode).toBe(400)
    payload.email = USER1_EMAIL

    // test failure (no socialSignInType)
    payload.socialSignInType = undefined
    res = await request(app)
      .post('/api/social-sign-in')
      .send(payload)
    expect(res.statusCode).toBe(400)
    payload.socialSignInType = bookcarsTypes.SocialSignInType.Google

    // test failure (no accessToken)
    payload.accessToken = undefined
    res = await request(app)
      .post('/api/social-sign-in')
      .send(payload)
    expect(res.statusCode).toBe(400)
    payload.accessToken = testHelper.GetRandromObjectIdAsString()

    // test failure (no payload)
    res = await request(app)
      .post('/api/social-sign-in')
    expect(res.statusCode).toBe(500)

    // test success (web httpOnly cookie mock)
    await jest.isolateModulesAsync(async () => {
      jest.unstable_mockModule('axios', () => ({
        default: {
          get: jest.fn(() => Promise.resolve({ data: { success: true } })),
        },
      }))
      const realHelper = await import('../src/utils/authHelper.js')
      jest.unstable_mockModule('../src/utils/authHelper.js', () => ({
        validateAccessToken: jest.fn(() => Promise.resolve(true)),
        encryptJWT: jest.fn(realHelper.encryptJWT),
        decryptJWT: jest.fn(realHelper.decryptJWT),
        isAdmin: jest.fn(realHelper.isAdmin),
        isFrontend: jest.fn(realHelper.isFrontend),
        getAuthCookieName: jest.fn(realHelper.getAuthCookieName),
        hashPassword: jest.fn(realHelper.hashPassword),
      }))
      jest.resetModules()
      const env = await import('../src/config/env.config.js')
      const newApp = (await import('../src/app.js')).default
      const dbh = await import('../src/utils/databaseHelper.js')

      await dbh.close()
      await dbh.connect(env.DB_URI, false, false)

      const payload: bookcarsTypes.SignInPayload = {
        email: USER1_EMAIL,
        socialSignInType: bookcarsTypes.SocialSignInType.Google,
        accessToken: testHelper.GetRandromObjectIdAsString(),
      }

      res = await request(newApp)
        .post('/api/social-sign-in')
        .send(payload)
      expect(res.statusCode).toBe(200)

      await dbh.close()
    })
  })
})

describe('POST /api/sign-out', () => {
  it('should sign out', async () => {
    // test success
    const res = await request(app)
      .post('/api/sign-out')
      .set('Cookie', [`${env.X_ACCESS_TOKEN}=${nanoid()};`])
    expect(res.statusCode).toBe(200)
    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies.length).toBe(1)
    expect(cookies[0]).toContain(`${env.X_ACCESS_TOKEN}=;`)
  })
})

describe('POST /api/create-push-token/:userId/:token', () => {
  it('should create push token', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let pushToken = nanoid()
    let res = await request(app)
      .post(`/api/create-push-token/${USER1_ID}/${pushToken}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    let pushNotifiation = await PushToken.findOne({ user: USER1_ID, token: pushToken })
    expect(pushNotifiation).not.toBeNull()

    // test failure (pushTken already exists)
    pushToken = nanoid()
    res = await request(app)
      .post(`/api/create-push-token/${USER1_ID}/${pushToken}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)
    pushNotifiation = await PushToken.findOne({ user: USER1_ID, token: pushToken })
    expect(pushNotifiation).toBeNull()

    // test failure (wrong user id)
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

    // test success
    let res = await request(app)
      .get(`/api/push-token/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(1)

    // test success (user not found)
    res = await request(app)
      .get(`/api/push-token/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test success (wrong user id)
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

    // test success
    let pushNotifiations = await PushToken.find({ user: USER1_ID })
    expect(pushNotifiations.length).toBeGreaterThan(0)
    let res = await request(app)
      .post(`/api/delete-push-token/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    pushNotifiations = await PushToken.find({ user: USER1_ID })
    expect(pushNotifiations.length).toBe(0)

    // test failure (wrong user id)
    res = await request(app)
      .post('/api/delete-push-token/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/validate-email', () => {
  it('returns the same response for existing and missing valid email addresses', async () => {
    const existingPayload: bookcarsTypes.ValidateEmailPayload = {
      email: USER1_EMAIL,
    }
    const existing = await request(app)
      .post('/api/validate-email')
      .send(existingPayload)

    const missing = await request(app)
      .post('/api/validate-email')
      .send({ email: testHelper.GetRandomEmail() })
    expect(existing.statusCode).toBe(200)
    expect(missing.statusCode).toBe(existing.statusCode)
    expect(missing.text).toBe(existing.text)

    const malformed = await request(app)
      .post('/api/validate-email')
      .send({ email: 'unknown' })
    expect(malformed.statusCode).toBe(400)
    expect(malformed.text).not.toContain(USER1_EMAIL)
  })
})

describe('POST /api/validate-access-token', () => {
  it('should validate access token', async () => {
    let token = await testHelper.signinAsAdmin()

    // test success
    let res = await request(app)
      .post('/api/validate-access-token')
      .set(env.X_ACCESS_TOKEN, token)

    expect(res.statusCode).toBe(200)

    // test failure (unauthorized)
    res = await request(app)
      .post('/api/validate-access-token')
      .set(env.X_ACCESS_TOKEN, nanoid())
    expect(res.statusCode).toBe(401)

    // test failure (user not found)
    const payload: authHelper.SessionData = { id: testHelper.GetRandromObjectIdAsString() }
    token = await authHelper.encryptJWT(payload, true)
    res = await request(app)
      .post('/api/validate-access-token')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(401)

    // test failure (forbidden)
    await testHelper.signout(token)
    res = await request(app)
      .post('/api/validate-access-token')
    expect(res.statusCode).toBe(403)
  })
})

describe('POST /api/update-user', () => {
  it('should update user', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const payload: bookcarsTypes.UpdateUserPayload = {
      _id: USER1_ID,
      fullName: 'user1-1',
      birthDate: new Date(1993, 5, 25),
      phone: '09090908',
      location: 'location1-1',
      bio: 'bio1-1',
      type: bookcarsTypes.UserType.Supplier,
      payLater: false,
      minimumRentalDays: 3,
      licenseRequired: true,
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
    expect(user?.minimumRentalDays).toBe(3)
    expect(user?.licenseRequired).toBeTruthy()

    // test success
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

    // test success (user not found)
    payload._id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test success (enableEmailNotifications)
    payload._id = USER1_ID
    payload.enableEmailNotifications = false
    payload.type = bookcarsTypes.UserType.User
    res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.enableEmailNotifications).toBeFalsy()

    // test failure (wrong user id)
    payload._id = '0'
    res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })

  it('enforces supplier field-level authorization independently in user.update', async () => {
    const supplier1Email = testHelper.GetRandomEmail()
    const supplier2Email = testHelper.GetRandomEmail()
    const supplier1Id = await testHelper.createSupplier(supplier1Email, testHelper.getSupplierName())
    const supplier2Id = await testHelper.createSupplier(supplier2Email, testHelper.getSupplierName())
    const regularUserId = await testHelper.createUser({
      email: testHelper.GetRandomEmail(),
      fullName: 'Restricted Update User',
    })
    const supplierToken = await testHelper.signin(supplier1Email, bookcarsTypes.AppType.Admin)
    const basePayload: bookcarsTypes.UpdateUserPayload = {
      _id: supplier1Id,
      fullName: 'Updated Supplier Name',
      phone: '01010101',
      location: 'supplier location',
      bio: 'supplier bio',
    }

    let res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, supplierToken)
      .send(basePayload)
    expect(res.statusCode).toBe(200)
    expect((await User.findById(supplier1Id))?.fullName).toBe(basePayload.fullName)

    for (const field of ['supplierCarLimit', 'notifyAdminOnNewCar', 'blacklisted']) {
      res = await request(app)
        .post('/api/update-user')
        .set(env.X_ACCESS_TOKEN, supplierToken)
        .send({ ...basePayload, [field]: field === 'notifyAdminOnNewCar' || field === 'blacklisted' ? false : 99 })
      expect(res.statusCode).toBe(403)
    }

    res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, supplierToken)
      .send({ ...basePayload, _id: supplier2Id })
    expect(res.statusCode).toBe(403)

    await testHelper.signout(supplierToken)

    const userToken = await testHelper.signinAsUser()
    res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, userToken)
      .send({ ...basePayload, _id: regularUserId, priceChangeRate: 99 })
    expect(res.statusCode).toBe(403)
    await testHelper.signout(userToken)

    const adminToken = await testHelper.signinAsAdmin()
    res = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, adminToken)
      .send({
        ...basePayload,
        _id: supplier1Id,
        priceChangeRate: 7,
        supplierCarLimit: 12,
        notifyAdminOnNewCar: true,
        minimumRentalDays: 4,
        blacklisted: false,
      })
    expect(res.statusCode).toBe(200)
    const updatedSupplier = await User.findById(supplier1Id)
    expect(updatedSupplier?.priceChangeRate).toBe(7)
    expect(updatedSupplier?.supplierCarLimit).toBe(12)
    expect(updatedSupplier?.notifyAdminOnNewCar).toBeTruthy()
    expect(updatedSupplier?.minimumRentalDays).toBe(4)
    expect(updatedSupplier?.blacklisted).toBeFalsy()
    await testHelper.signout(adminToken)

    await testHelper.deleteSupplier(supplier1Id)
    await testHelper.deleteSupplier(supplier2Id)
    await testHelper.deleteUser(regularUserId)
  })
})

describe('POST /api/update-email-notifications', () => {
  it('should update email notifications setting', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
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

    // test success (user not found)
    payload._id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/update-email-notifications')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test failure (wrong user id)
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

    // test success
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

    // test success (user not found)
    payload.id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/update-language')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test failure (wrong user id)
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

    // test success
    let res = await request(app)
      .get(`/api/user/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.email).toBe(USER1_EMAIL)

    // test success (user not found)
    res = await request(app)
      .get(`/api/user/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test failure (wrong user id)
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

    // test success
    let res = await request(app)
      .post('/api/create-avatar')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', AVATAR1_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    const filePath = path.join(env.CDN_TEMP_USERS, filename)
    const avatarExists = await helper.pathExists(filePath)
    expect(avatarExists).toBeTruthy()
    await asyncFs.unlink(filePath)

    // test failure (image not attached)
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

    // test success
    let res = await request(app)
      .post(`/api/update-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', AVATAR2_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    let avatarExists = await helper.pathExists(path.join(env.CDN_USERS, filename))
    expect(avatarExists).toBeTruthy()
    const user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.avatar).toBeDefined()
    expect(user?.avatar).not.toBeNull()

    // test success (avatar file not found)
    user!.avatar = `${nanoid()}.jpg`
    await user?.save()
    res = await request(app)
      .post(`/api/update-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', AVATAR2_PATH)
    expect(res.statusCode).toBe(200)
    avatarExists = await helper.pathExists(path.join(env.CDN_USERS, filename))
    expect(avatarExists).toBeTruthy()

    // test success (avatar not set)
    user!.avatar = undefined
    await user?.save()
    res = await request(app)
      .post(`/api/update-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', AVATAR2_PATH)
    expect(res.statusCode).toBe(200)
    avatarExists = await helper.pathExists(path.join(env.CDN_USERS, filename))
    expect(avatarExists).toBeTruthy()

    // test failure (avatar not attached)
    res = await request(app)
      .post(`/api/update-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test success (user not found)
    res = await request(app)
      .post(`/api/update-avatar/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', AVATAR2_PATH)
    expect(res.statusCode).toBe(204)

    // test failure (wrong user id)
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

    // test success
    let user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.avatar).toBeDefined()
    expect(user?.avatar).not.toBeNull()
    const filePath = path.join(env.CDN_USERS, user?.avatar as string)
    let avatarExists = await helper.pathExists(filePath)
    expect(avatarExists).toBeTruthy()
    let res = await request(app)
      .post(`/api/delete-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    avatarExists = await helper.pathExists(filePath)
    expect(avatarExists).toBeFalsy()
    user = await User.findById(USER1_ID)
    expect(user).not.toBeNull()
    expect(user?.avatar).toBeUndefined()

    // test success (avatar file not found)
    user!.avatar = `${nanoid()}.jpg`
    await user?.save()
    res = await request(app)
      .post(`/api/delete-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (avatar not set)
    user!.avatar = undefined
    await user?.save()
    res = await request(app)
      .post(`/api/delete-avatar/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (user not found)
    res = await request(app)
      .post(`/api/delete-avatar/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test failure (wrong user id)
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

    // test success
    const tempAvatar = path.join(env.CDN_TEMP_USERS, AVATAR1)
    if (!(await helper.pathExists(tempAvatar))) {
      await asyncFs.copyFile(AVATAR1_PATH, tempAvatar)
    }
    let res = await request(app)
      .post(`/api/delete-temp-avatar/${AVATAR1}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    const tempImageExists = await helper.pathExists(tempAvatar)
    expect(tempImageExists).toBeFalsy()

    // test failure (avatar file not found)
    res = await request(app)
      .post('/api/delete-temp-avatar/unknown.jpg')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('User update and password authorization security', () => {
  const supplierEmail = testHelper.GetRandomEmail()
  const managedUserEmail = testHelper.GetRandomEmail()
  const otherUserEmail = testHelper.GetRandomEmail()
  let supplierId: string
  let managedUserId: string
  let otherUserId: string
  let managedUserPasswordHash: string

  beforeAll(async () => {
    supplierId = await testHelper.createSupplier(supplierEmail, 'User Authorization Test Supplier')
    managedUserPasswordHash = await authHelper.hashPassword(testHelper.PASSWORD)

    const managedUser = new User({
      email: managedUserEmail,
      fullName: 'Managed User',
      language: testHelper.LANGUAGE,
      password: managedUserPasswordHash,
      type: bookcarsTypes.UserType.User,
      supplier: supplierId,
      verified: true,
      active: true,
      blacklisted: false,
    })
    await managedUser.save()
    managedUserId = managedUser._id.toString()

    const otherUser = new User({
      email: otherUserEmail,
      fullName: 'Other User',
      language: testHelper.LANGUAGE,
      password: managedUserPasswordHash,
      type: bookcarsTypes.UserType.User,
    })
    await otherUser.save()
    otherUserId = otherUser._id.toString()
  })

  afterAll(async () => {
    await User.deleteMany({ _id: { $in: [managedUserId, otherUserId] } })
    await testHelper.deleteSupplier(supplierId)
  })

  const setAvatar = async (userId: string) => {
    const filename = `${userId}_${nanoid()}.jpg`
    await asyncFs.copyFile(AVATAR1_PATH, path.join(env.CDN_USERS, filename))
    const user = await User.findById(userId)
    expect(user).not.toBeNull()
    user!.avatar = filename
    await user!.save()
    return filename
  }

  const removeAvatarFile = async (filename: string) => {
    const filepath = path.join(env.CDN_USERS, filename)
    if (await helper.pathExists(filepath)) {
      await asyncFs.unlink(filepath)
    }
  }

  it('allows users to update and delete their own avatars', async () => {
    const userToken = await testHelper.generateToken(otherUserId)
    const originalFilename = await setAvatar(otherUserId)
    let updatedFilename: string | undefined

    try {
      let response = await request(app)
        .post(`/api/update-avatar/${otherUserId}`)
        .set(env.X_ACCESS_TOKEN, userToken)
        .attach('image', AVATAR2_PATH)
      expect(response.statusCode).toBe(200)
      updatedFilename = response.body as string
      let user = await User.findById(otherUserId)
      expect(user?.avatar).toBe(updatedFilename)
      expect(await helper.pathExists(path.join(env.CDN_USERS, updatedFilename))).toBe(true)
      expect(await helper.pathExists(path.join(env.CDN_USERS, originalFilename))).toBe(false)

      response = await request(app)
        .post(`/api/delete-avatar/${otherUserId}`)
        .set(env.X_ACCESS_TOKEN, userToken)
      expect(response.statusCode).toBe(200)
      user = await User.findById(otherUserId)
      expect(user?.avatar).toBeUndefined()
      expect(await helper.pathExists(path.join(env.CDN_USERS, updatedFilename))).toBe(false)
    } finally {
      await removeAvatarFile(originalFilename)
      if (updatedFilename) {
        await removeAvatarFile(updatedFilename)
      }
      const user = await User.findById(otherUserId)
      if (user) {
        user.avatar = undefined
        await user.save()
      }
    }
  })

  it('prevents users from updating or deleting another user avatar without side effects', async () => {
    const userToken = await testHelper.generateToken(otherUserId)
    const victimFilename = await setAvatar(managedUserId)

    try {
      let response = await request(app)
        .post(`/api/update-avatar/${managedUserId}`)
        .set(env.X_ACCESS_TOKEN, userToken)
        .attach('image', AVATAR2_PATH)
      expect(response.statusCode).toBe(403)
      let victim = await User.findById(managedUserId)
      expect(victim?.avatar).toBe(victimFilename)
      expect(await helper.pathExists(path.join(env.CDN_USERS, victimFilename))).toBe(true)

      response = await request(app)
        .post(`/api/delete-avatar/${managedUserId}`)
        .set(env.X_ACCESS_TOKEN, userToken)
      expect(response.statusCode).toBe(403)
      victim = await User.findById(managedUserId)
      expect(victim?.avatar).toBe(victimFilename)
      expect(await helper.pathExists(path.join(env.CDN_USERS, victimFilename))).toBe(true)
    } finally {
      await removeAvatarFile(victimFilename)
      const victim = await User.findById(managedUserId)
      if (victim) {
        victim.avatar = undefined
        await victim.save()
      }
    }
  })

  it('allows suppliers to manage their own and linked user avatars only', async () => {
    const supplierToken = await testHelper.generateToken(supplierId)
    const supplierFilename = await setAvatar(supplierId)
    const managedFilename = await setAvatar(managedUserId)
    let supplierUpdatedFilename: string | undefined
    let managedUpdatedFilename: string | undefined

    try {
      let response = await request(app)
        .post(`/api/update-avatar/${supplierId}`)
        .set(env.X_ACCESS_TOKEN, supplierToken)
        .attach('image', AVATAR2_PATH)
      expect(response.statusCode).toBe(200)
      supplierUpdatedFilename = response.body as string

      response = await request(app)
        .post(`/api/update-avatar/${managedUserId}`)
        .set(env.X_ACCESS_TOKEN, supplierToken)
        .attach('image', AVATAR2_PATH)
      expect(response.statusCode).toBe(200)
      managedUpdatedFilename = response.body as string

      response = await request(app)
        .post(`/api/delete-avatar/${managedUserId}`)
        .set(env.X_ACCESS_TOKEN, supplierToken)
      expect(response.statusCode).toBe(200)
      const managedUser = await User.findById(managedUserId)
      expect(managedUser?.avatar).toBeUndefined()
      expect(await helper.pathExists(path.join(env.CDN_USERS, managedUpdatedFilename))).toBe(false)

      response = await request(app)
        .post(`/api/delete-avatar/${otherUserId}`)
        .set(env.X_ACCESS_TOKEN, supplierToken)
      expect(response.statusCode).toBe(403)
      const otherUser = await User.findById(otherUserId)
      expect(otherUser?.avatar).toBeUndefined()
    } finally {
      for (const filename of [supplierFilename, managedFilename, supplierUpdatedFilename, managedUpdatedFilename]) {
        if (filename) {
          await removeAvatarFile(filename)
        }
      }
      const supplier = await User.findById(supplierId)
      if (supplier) {
        supplier.avatar = undefined
        await supplier.save()
      }
      const managedUser = await User.findById(managedUserId)
      if (managedUser) {
        managedUser.avatar = undefined
        await managedUser.save()
      }
    }
  })

  it('allows administrators to update and delete another account avatar', async () => {
    const adminToken = await testHelper.generateToken(testHelper.getAdminUserId())
    const originalFilename = await setAvatar(otherUserId)
    let updatedFilename: string | undefined

    try {
      let response = await request(app)
        .post(`/api/update-avatar/${otherUserId}`)
        .set(env.X_ACCESS_TOKEN, adminToken)
        .attach('image', AVATAR2_PATH)
      expect(response.statusCode).toBe(200)
      updatedFilename = response.body as string

      response = await request(app)
        .post(`/api/delete-avatar/${otherUserId}`)
        .set(env.X_ACCESS_TOKEN, adminToken)
      expect(response.statusCode).toBe(200)
      const user = await User.findById(otherUserId)
      expect(user?.avatar).toBeUndefined()
    } finally {
      await removeAvatarFile(originalFilename)
      if (updatedFilename) {
        await removeAvatarFile(updatedFilename)
      }
      const user = await User.findById(otherUserId)
      if (user) {
        user.avatar = undefined
        await user.save()
      }
    }
  })

  it('rejects unauthenticated avatar changes and preserves not-found responses', async () => {
    let response = await request(app)
      .post(`/api/update-avatar/${managedUserId}`)
      .attach('image', AVATAR2_PATH)
    expect(response.statusCode).toBe(403)

    response = await request(app)
      .post(`/api/delete-avatar/${managedUserId}`)
    expect(response.statusCode).toBe(403)

    const userToken = await testHelper.generateToken(otherUserId)
    const missingUserId = testHelper.GetRandromObjectIdAsString()
    response = await request(app)
      .post(`/api/update-avatar/${missingUserId}`)
      .set(env.X_ACCESS_TOKEN, userToken)
      .attach('image', AVATAR2_PATH)
    expect(response.statusCode).toBe(204)

    response = await request(app)
      .post(`/api/delete-avatar/${missingUserId}`)
      .set(env.X_ACCESS_TOKEN, userToken)
    expect(response.statusCode).toBe(204)
  })

  it('denies supplier access to admin accounts while allowing supplier-managed user password resets', async () => {
    const supplierToken = await testHelper.generateToken(supplierId)
    const newPassword = 'Supplier-Managed-Reset-Password!'

    let response = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, supplierToken)
      .send({
        _id: testHelper.getAdminUserId(),
        password: '',
        newPassword,
        strict: false,
      })
    expect(response.statusCode).toBe(403)

    response = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, supplierToken)
      .send({
        _id: managedUserId,
        password: '',
        newPassword,
        strict: false,
      })
    expect(response.statusCode).toBe(200)
    const managedUser = await User.findById(managedUserId)
    expect(await bcrypt.compare(newPassword, managedUser!.password!)).toBe(true)
  })

  it('preserves administrative password reset and account-update capabilities', async () => {
    const adminToken = await testHelper.signinAsAdmin()
    const newPassword = 'Administrator-Reset-Password!'
    const target = await User.findById(otherUserId)
    expect(target).not.toBeNull()

    let response = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, adminToken)
      .send({
        _id: otherUserId,
        password: '',
        newPassword,
        strict: false,
      })
    expect(response.statusCode).toBe(200)
    let otherUser = await User.findById(otherUserId)
    expect(await bcrypt.compare(newPassword, otherUser!.password!)).toBe(true)

    response = await request(app)
      .post('/api/update-user')
      .set(env.X_ACCESS_TOKEN, adminToken)
      .send({
        _id: otherUserId,
        type: bookcarsTypes.UserType.Supplier,
        blacklisted: true,
      })
    expect(response.statusCode).toBe(200)
    otherUser = await User.findById(otherUserId)
    expect(otherUser?.type).toBe(bookcarsTypes.UserType.Supplier)
    expect(otherUser?.blacklisted).toBe(true)

    await testHelper.signout(adminToken)
  })
})

describe('POST /api/change-password', () => {
  it('should change password', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (strict)
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

    // test success (not strict)
    payload.password = newPassword
    payload.newPassword = USER1_PASSWORD
    payload.strict = false
    res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    // test success (no password)
    payload.strict = true
    payload.password = ''
    res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test success (wrong password)
    payload.password = 'wrong-password'
    res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test success (user not found)
    payload._id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test success (user's passowrd undefined)
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

    // test failure (wrong user id)
    payload._id = '0'
    res = await request(app)
      .post('/api/change-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/check-password', () => {
  it('should check password', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (good password)
    let res = await request(app)
      .post('/api/check-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send({ _id: USER1_ID, password: USER1_PASSWORD })
    expect(res.statusCode).toBe(200)

    // test success (wrong password)
    res = await request(app)
      .post('/api/check-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send({ _id: USER1_ID, password: 'wrong-password' })
    expect(res.statusCode).toBe(204)

    // test success (user's password undefined)
    res = await request(app)
      .post('/api/check-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send({ _id: USER2_ID, password: 'some-password' })
    expect(res.statusCode).toBe(204)

    // test success (user not found)
    res = await request(app)
      .post('/api/check-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send({ _id: testHelper.GetRandromObjectIdAsString(), password: 'some-password' })
    expect(res.statusCode).toBe(204)

    // test failure (wrong user id)
    res = await request(app)
      .post('/api/check-password')
      .set(env.X_ACCESS_TOKEN, token)
      .send({ _id: '0', password: 'some-password' })
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })

  it('should forbid a regular user from checking another user password', async () => {
    const userToken = await testHelper.signinAsUser()

    const res = await request(app)
      .post('/api/check-password')
      .send({ _id: USER1_ID, password: USER1_PASSWORD })
      .set(env.X_ACCESS_TOKEN, userToken)
    expect(res.statusCode).toBe(403)

    await testHelper.signout(userToken)
  })

  it('should allow a regular user to check their own password', async () => {
    const userToken = await testHelper.signinAsUser()

    const res = await request(app)
      .post('/api/check-password')
      .send({ _id: testHelper.getUserId(), password: testHelper.PASSWORD })
      .set(env.X_ACCESS_TOKEN, userToken)
    expect(res.statusCode).toBe(200)

    await testHelper.signout(userToken)
  })
})

describe('POST /api/users/:page/:size', () => {
  it('should get users', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (admin)
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

    // test success (user not set)
    payload.user = ''
    res = await request(app)
      .post(`/api/users/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(3)

    // test failure (wrong page number)
    res = await request(app)
      .post(`/api/users/unknown/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/has-password/:id', () => {
  it('should get users', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let res = await request(app)
      .get(`/api/has-password/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (user not found)
    res = await request(app)
      .get(`/api/has-password/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test failure (wrong user id)
    res = await request(app)
      .get('/api/has-password/wrong-id')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/create-license', () => {
  it('should create a license', async () => {
    // test success
    let res = await request(app)
      .post('/api/create-license')
      .attach('file', LICENSE1_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    const filePath = path.join(env.CDN_TEMP_LICENSES, filename)
    const licenseExists = await helper.pathExists(filePath)
    expect(licenseExists).toBeTruthy()
    await asyncFs.unlink(filePath)

    // test failure (file not sent)
    res = await request(app)
      .post('/api/create-license')
    expect(res.statusCode).toBe(400)

    // test failure (filename not valid)
    const invalidContract = path.join(env.CDN_TEMP_LICENSES, `${nanoid()}`)
    await asyncFs.copyFile(LICENSE1_PATH, invalidContract)
    res = await request(app)
      .post('/api/create-license')
      .attach('file', invalidContract)
    expect(res.statusCode).toBe(400)
    await asyncFs.unlink(invalidContract)
  })
})

describe('POST /api/update-license/:id', () => {
  it('should update a license', async () => {
    const token = await testHelper.signinAsUser()

    // test success (no initial license)
    let user = await User.findById(USER1_ID)
    let res = await request(app)
      .post(`/api/update-license/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', LICENSE1_PATH)
    expect(res.statusCode).toBe(200)
    let filename = res.body as string
    expect(filename).toBeTruthy()
    expect(await helper.pathExists(path.join(env.CDN_LICENSES, filename))).toBeTruthy()
    user = await User.findById(USER1_ID)
    expect(user).toBeTruthy()
    expect(user?.license).toBe(filename)

    // test success (initial license)
    res = await request(app)
      .post(`/api/update-license/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', LICENSE2_PATH)
    expect(res.statusCode).toBe(200)
    filename = res.body as string
    expect(filename).toBeTruthy()
    expect(await helper.pathExists(path.join(env.CDN_LICENSES, filename))).toBeTruthy()
    user = await User.findById(USER1_ID)
    expect(filename).toBe(user?.license)

    // test success (license file does not exist)
    user!.license = `${nanoid()}.pdf`
    await user?.save()
    res = await request(app)
      .post(`/api/update-license/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', LICENSE1_PATH)
    expect(res.statusCode).toBe(200)
    filename = res.body as string
    expect(filename).toBeTruthy()
    expect(await helper.pathExists(path.join(env.CDN_LICENSES, filename))).toBeTruthy()
    user = await User.findById(USER1_ID)
    expect(filename).toBe(user?.license)
    user!.license = filename
    await user?.save()

    // test failure (file not sent)
    res = await request(app)
      .post(`/api/update-license/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test failure (filename not valid)
    const invalidContract = path.join(env.CDN_TEMP_LICENSES, `${nanoid()}`)
    await asyncFs.copyFile(LICENSE1_PATH, invalidContract)
    res = await request(app)
      .post(`/api/update-license/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', invalidContract)
    expect(res.statusCode).toBe(400)
    await asyncFs.unlink(invalidContract)

    // test failure (user not found)
    res = await request(app)
      .post(`/api/update-license/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', LICENSE1_PATH)
    expect(res.statusCode).toBe(204)

    // test failure (user id not valid)
    res = await request(app)
      .post('/api/update-license/0')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', LICENSE1_PATH)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-license/:id', () => {
  it('should delete a license', async () => {
    const token = await testHelper.signinAsUser()

    // test success
    let user = await User.findById(USER1_ID)
    expect(user).toBeTruthy()
    expect(user?.license).toBeTruthy()
    const filename = user?.license as string
    let imageExists = await helper.pathExists(path.join(env.CDN_LICENSES, filename))
    expect(imageExists).toBeTruthy()
    let res = await request(app)
      .post(`/api/delete-license/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    imageExists = await helper.pathExists(path.join(env.CDN_LICENSES, filename))
    expect(imageExists).toBeFalsy()
    user = await User.findById(USER1_ID)
    expect(user?.license).toBeFalsy()

    // test success (no license)
    user = await User.findById(USER1_ID)
    expect(user).toBeTruthy()
    user!.license = undefined
    await user!.save()
    res = await request(app)
      .post(`/api/delete-license/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (license with no file)
    user = await User.findById(USER1_ID)
    expect(user).toBeTruthy()
    user!.license = null
    await user!.save()
    res = await request(app)
      .post(`/api/delete-license/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (license with file not found)
    user = await User.findById(USER1_ID)
    expect(user).toBeTruthy()
    user!.license = `${nanoid()}.pdf`
    await user!.save()
    res = await request(app)
      .post(`/api/delete-license/${USER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test failure (user not found)
    res = await request(app)
      .post(`/api/delete-license/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test failure (user id not valid)
    res = await request(app)
      .post('/api/delete-license/invalid-id')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-temp-license/:image', () => {
  it('should delete a temporary license', async () => {
    // init
    const tempImage = path.join(env.CDN_TEMP_LICENSES, LICENSE1)
    if (!(await helper.pathExists(tempImage))) {
      await asyncFs.copyFile(LICENSE1_PATH, tempImage)
    }

    // test success (temp file exists)
    let res = await request(app)
      .post(`/api/delete-temp-license/${LICENSE1}`)
    expect(res.statusCode).toBe(200)
    const tempImageExists = await helper.pathExists(tempImage)
    expect(tempImageExists).toBeFalsy()

    // test success (temp file not found)
    res = await request(app)
      .post('/api/delete-temp-license/unknown.pdf')
    expect(res.statusCode).toBe(200)

    // test failure (temp file not valid)
    // res = await request(app)
    //   .post('/api/delete-temp-license/unknown')
    // expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/delete-users', () => {
  it('should delete users', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const supplierName1 = testHelper.getSupplierName()
    const supplier1Id = await testHelper.createSupplier(`${supplierName1}@test.bookcars.ma`, supplierName1)
    const supplierName2 = testHelper.getSupplierName()
    const supplier2Id = await testHelper.createSupplier(`${supplierName2}@test.bookcars.ma`, supplierName1)
    const supplier2 = await User.findById(supplier2Id)
    supplier2!.contracts = [
      { language: 'en', file: null },
      { language: 'fr', file: `${nanoid()}.pdf` },
    ]
    await supplier2?.save()
    let payload: string[] = [USER1_ID, USER2_ID, ADMIN_ID, supplier1Id, supplier2Id]
    const user1 = await User.findById(USER1_ID)
    user1!.avatar = `${nanoid()}.jpg`
    user1!.license = `${nanoid()}.pdf`
    await user1?.save()
    const user2 = await User.findById(USER2_ID)
    const licenseFilename = `${user2!._id.toString()}.pdf`
    const license = path.join(env.CDN_LICENSES, licenseFilename)
    if (!(await helper.pathExists(license))) {
      await asyncFs.copyFile(LICENSE1_PATH, license)
    }
    user2!.license = licenseFilename
    await user2?.save()

    let users = await User.find({ _id: { $in: payload } })
    expect(users.length).toBe(4)
    let res = await request(app)
      .post('/api/delete-users')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    users = await User.find({ _id: { $in: payload } })
    expect(users.length).toBe(0)

    // test success (user not found)
    payload = [testHelper.GetRandromObjectIdAsString()]
    res = await request(app)
      .post('/api/delete-users')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    // test success (full data)
    const supplierName = testHelper.getSupplierName()
    const supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    const locationId = await testHelper.createLocation('Location 1 EN', 'Location 1 FR')
    const imageName = 'bmw-x1.jpg'
    const imagePath = path.join(__dirname, `./img/${imageName}`)
    const image = path.join(env.CDN_CARS, imageName)
    if (!(await helper.pathExists(image))) {
      await asyncFs.copyFile(imagePath, image)
    }
    let car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      dailyPrice: 78,
      deposit: 950,
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
      theftProtection: 9,
      collisionDamageWaiver: 12,
      fullInsurance: 20,
      additionalDriver: 20,
      range: bookcarsTypes.CarRange.Midi,
    })
    await car.save()
    car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      dailyPrice: 78,
      deposit: 950,
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
      theftProtection: 9,
      collisionDamageWaiver: 12,
      fullInsurance: 20,
      additionalDriver: 20,
      range: bookcarsTypes.CarRange.Midi,
    })
    await car.save()
    car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      dailyPrice: 78,
      deposit: 950,
      available: false,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      image: `${nanoid()}.jpg`,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 9,
      collisionDamageWaiver: 12,
      fullInsurance: 20,
      additionalDriver: 20,
      range: bookcarsTypes.CarRange.Midi,
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
    expect(await helper.pathExists(image)).toBeFalsy()
    testHelper.deleteLocation(locationId)

    // test failure (no payload)
    res = await request(app)
      .post('/api/delete-users')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/verify-recaptcha/:token/:ip', () => {
  it('should verify reCAPTCHA', async () => {
    const ip = '127.0.0.1'
    const recaptchaToken = 'xxxxxxxxxxxxx'
    const previousRecaptchaSecret = process.env.BC_RECAPTCHA_SECRET
    process.env.BC_RECAPTCHA_SECRET = 'test-secret'

    // test success (valid)
    jest.unstable_mockModule('axios', () => ({
      default: {
        post: jest.fn(() => Promise.resolve({ data: { success: true, action: 'submit', score: 0.9 } })),
      },
    }))
    jest.resetModules()

    await jest.isolateModulesAsync(async () => {
      const newApp = (await import('../src/app.js')).default

      const res = await request(newApp)
        .post(`/api/verify-recaptcha/${recaptchaToken}/${ip}`)
      expect(res.statusCode).toBe(200)
    })

    // test failure (not valid)
    jest.unstable_mockModule('axios', () => ({
      default: {
        post: jest.fn(() => Promise.resolve({ data: { success: false } })),
      },
    }))
    jest.resetModules()

    await jest.isolateModulesAsync(async () => {
      const newApp = (await import('../src/app.js')).default

      const res = await request(newApp)
        .post(`/api/verify-recaptcha/${recaptchaToken}/${ip}`)
      expect(res.statusCode).toBe(204)
    })

    // test failure (error)
    jest.unstable_mockModule('axios', () => ({
      default: {
        post: jest.fn(() => Promise.reject(new Error('mock error'))),
      },
    }))
    jest.resetModules()

    await jest.isolateModulesAsync(async () => {
      const newApp = (await import('../src/app.js')).default

      const res = await request(newApp)
        .post(`/api/verify-recaptcha/${recaptchaToken}/${ip}`)
      expect(res.statusCode).toBe(503)
    })

    if (previousRecaptchaSecret === undefined) {
      delete process.env.BC_RECAPTCHA_SECRET
    } else {
      process.env.BC_RECAPTCHA_SECRET = previousRecaptchaSecret
    }
  })
})

describe('POST /api/send-email', () => {
  it('rejects requests without an allowed Origin', async () => {
    let res = await request(app)
      .post('/api/send-email')
    expect(res.statusCode).toBe(400)

    res = await request(app)
      .post('/api/send-email')
      .set('Origin', 'https://unknown.com')
    expect(res.statusCode).toBe(500)
  })
})
