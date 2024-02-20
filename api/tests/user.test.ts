import 'dotenv/config'
import request from 'supertest'
import url from 'url'
import path from 'path'
import fs from 'node:fs/promises'
import { v1 as uuid } from 'uuid'
import * as bookcarsTypes from 'bookcars-types'
import app from '../src/app'
import * as DatabaseHelper from '../src/common/DatabaseHelper'
import * as TestHelper from './TestHelper'
import * as env from '../src/config/env.config'
import User from '../src/models/User'
import Token from '../src/models/Token'
import PushNotification from '../src/models/PushNotification'
import * as Helper from '../src/common/Helper'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const AVATAR1 = 'avatar1.jpg'
const AVATAR1_PATH = path.resolve(__dirname, `./img/${AVATAR1}`)
const AVATAR2 = 'avatar2.png'
const AVATAR2_PATH = path.resolve(__dirname, `./img/${AVATAR2}`)

let USER1_ID: string
let USER2_ID: string
let ADMIN_ID: string

const USER1_EMAIL = `${TestHelper.getName('user1')}@test.bookcars.ma`
let USER1_PASSWORD = TestHelper.PASSWORD
const USER2_EMAIL = `${TestHelper.getName('user2')}@test.bookcars.ma`
const ADMIN_EMAIL = `${TestHelper.getName('admin')}@test.bookcars.ma`

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
    if (await DatabaseHelper.Connect(false)) {
        await TestHelper.initializeDatabase()
    }
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
    await TestHelper.clearDatabase()

    await Token.deleteMany({ user: { $in: [ADMIN_ID] } })

    await DatabaseHelper.Close(false)
})

//
// Unit tests
//

describe('POST /api/sign-up', () => {
    it('should create a user', async () => {
        const payload: bookcarsTypes.SignUpPayload = {
            email: USER1_EMAIL,
            password: USER1_PASSWORD,
            fullName: 'user1',
            language: TestHelper.LANGUAGE,
            birthDate: new Date(1992, 5, 25),
            phone: '09090909',
        }

        const res = await request(app)
            .post('/api/sign-up')
            .send(payload)

        expect(res.statusCode).toBe(200)

        const user = await User.findOne({ email: USER1_EMAIL })
        expect(user).not.toBeNull()
        USER1_ID = user?.id
        expect(user?.type).toBe(bookcarsTypes.UserType.User)
        expect(user?.email).toBe(payload.email)
        expect(user?.fullName).toBe(payload.fullName)
        expect(user?.language).toBe(payload.language)
        expect(user?.birthDate).toStrictEqual(payload.birthDate)
        expect(user?.phone).toBe(payload.phone)
    })
})

describe('POST /api/admin-sign-up', () => {
    it('should create an admin user', async () => {
        const payload: bookcarsTypes.SignUpPayload = {
            email: ADMIN_EMAIL,
            password: TestHelper.PASSWORD,
            fullName: 'admin',
            language: TestHelper.LANGUAGE,
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
    })
})

describe('POST /api/create-user', () => {
    it('should create a user', async () => {
        const token = await TestHelper.signinAsAdmin()

        const payload: bookcarsTypes.CreateUserPayload = {
            email: USER2_EMAIL,
            fullName: 'user2',
            language: TestHelper.LANGUAGE,
            birthDate: new Date(1992, 5, 25),
            phone: '09090909',
            location: 'location',
            bio: 'bio',
        }

        const res = await request(app)
            .post('/api/create-user')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)

        const user = await User.findOne({ email: USER2_EMAIL })
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

        await TestHelper.signout(token)
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
            .get(`/api/check-token/${bookcarsTypes.AppType.Frontend}/${TestHelper.GetRandromObjectIdAsString()}/${USER1_EMAIL}/${token}`)
        expect(res.statusCode).toBe(204)
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
            password: TestHelper.PASSWORD,
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

        payload.userId = TestHelper.GetRandromObjectIdAsString()

        res = await request(app)
            .post('/api/activate')
            .send(payload)

        expect(res.statusCode).toBe(204)
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
            .get(`/api/confirm-email/${TestHelper.GetRandomEmail()}/${token}`)

        expect(res.statusCode).toBe(204)

        res = await request(app)
            .get(`/api/confirm-email/${USER1_EMAIL}/${uuid()}`)

        expect(res.statusCode).toBe(400)
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
    })
})

describe('POST /api/resend/:type/:email/:reset', () => {
    it('should resend validation email', async () => {
        let user = await User.findById(USER1_ID)
        expect(user).not.toBeNull()
        user!.active = true
        await user!.save()

        const reset = true

        let res = await request(app)
            .post(`/api/resend/${bookcarsTypes.AppType.Frontend}/${USER1_EMAIL}/${reset}`)

        expect(res.statusCode).toBe(200)

        user = await User.findById(USER1_ID)
        expect(user).not.toBeNull()
        expect(user?.active).toBeFalsy()

        res = await request(app)
            .post(`/api/resend/${bookcarsTypes.AppType.Backend}/${USER1_EMAIL}/${reset}`)

        expect(res.statusCode).toBe(403)

        res = await request(app)
            .post(`/api/resend/${bookcarsTypes.AppType.Frontend}/${TestHelper.GetRandomEmail()}/${reset}`)

        expect(res.statusCode).toBe(204)
    })
})

describe('POST /api/sign-in/:type', () => {
    it('should sign in', async () => {
        const payload: bookcarsTypes.SignInPayload = {
            email: USER1_EMAIL,
            password: USER1_PASSWORD,
        }

        const res = await request(app)
            .post(`/api/sign-in/${bookcarsTypes.AppType.Frontend}`)
            .send(payload)

        expect(res.statusCode).toBe(200)
        const cookies = res.headers['set-cookie'] as unknown as string[]
        expect(cookies.length).toBeGreaterThan(1)
        const token = TestHelper.getToken(cookies[1])
        expect(token).toBeDefined()
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
        const token = await TestHelper.signinAsAdmin()

        let pushToken = uuid()

        let res = await request(app)
            .post(`/api/create-push-token/${USER1_ID}/${pushToken}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)

        let pushNotifiation = await PushNotification.findOne({ user: USER1_ID, token: pushToken })
        expect(pushNotifiation).not.toBeNull()

        pushToken = uuid()

        res = await request(app)
            .post(`/api/create-push-token/${USER1_ID}/${pushToken}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(400)

        pushNotifiation = await PushNotification.findOne({ user: USER1_ID, token: pushToken })
        expect(pushNotifiation).toBeNull()

        await TestHelper.signout(token)
    })
})

describe('GET /api/push-token/:userId', () => {
    it('should get push token', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .get(`/api/push-token/${USER1_ID}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBeGreaterThan(1)

        await TestHelper.signout(token)
    })
})

describe('POST /api/delete-push-token/:userId', () => {
    it('should delete push token', async () => {
        const token = await TestHelper.signinAsAdmin()

        let pushNotifiations = await PushNotification.find({ user: USER1_ID })
        expect(pushNotifiations.length).toBeGreaterThan(0)

        const res = await request(app)
            .post(`/api/delete-push-token/${USER1_ID}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)

        pushNotifiations = await PushNotification.find({ user: USER1_ID })
        expect(pushNotifiations.length).toBe(0)

        await TestHelper.signout(token)
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

        payload.email = TestHelper.GetRandomEmail()

        res = await request(app)
            .post('/api/validate-email')
            .send(payload)

        expect(res.statusCode).toBe(200)
    })
})

describe('POST /api/validate-access-token', () => {
    it('should validate access token', async () => {
        const token = await TestHelper.signinAsAdmin()

        let res = await request(app)
            .post('/api/validate-access-token')
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)

        res = await request(app)
            .post('/api/validate-access-token')
            .set(env.X_ACCESS_TOKEN, uuid())

        expect(res.statusCode).toBe(401)

        await TestHelper.signout(token)

        res = await request(app)
            .post('/api/validate-access-token')

        expect(res.statusCode).toBe(403)
    })
})

describe('POST /api/resend-link', () => {
    it('should resend activation link', async () => {
        const token = await TestHelper.signinAsAdmin()

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

        payload.email = TestHelper.GetRandomEmail()

        res = await request(app)
            .post('/api/resend-link')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(400)

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-user', () => {
    it('should update user', async () => {
        const token = await TestHelper.signinAsAdmin()

        const payload: bookcarsTypes.UpdateUserPayload = {
            _id: USER1_ID,
            fullName: 'user1-1',
            birthDate: new Date(1993, 5, 25),
            phone: '09090908',
            location: 'location1-1',
            bio: 'bio1-1',
            type: bookcarsTypes.UserType.Company,
            payLater: false,
        }

        const res = await request(app)
            .post('/api/update-user')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)

        const user = await User.findById(USER1_ID)
        expect(user).not.toBeNull()
        expect(user?.type).toBe(bookcarsTypes.UserType.Company)
        expect(user?.fullName).toBe(payload.fullName)
        expect(user?.birthDate).toStrictEqual(payload.birthDate)
        expect(user?.phone).toBe(payload.phone)
        expect(user?.location).toBe(payload.location)
        expect(user?.bio).toBe(payload.bio)
        expect(user?.payLater).toBeFalsy()

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-email-notifications', () => {
    it('should update email notifications setting', async () => {
        const token = await TestHelper.signinAsAdmin()

        let user = await User.findById(USER1_ID)
        expect(user).not.toBeNull()
        expect(user?.enableEmailNotifications).toBeTruthy()

        const payload: bookcarsTypes.UpdateEmailNotificationsPayload = {
            _id: USER1_ID,
            enableEmailNotifications: false,
        }

        const res = await request(app)
            .post('/api/update-email-notifications')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)

        user = await User.findById(USER1_ID)
        expect(user).not.toBeNull()
        expect(user?.enableEmailNotifications).toBeFalsy()

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-language', () => {
    it("should update user's language", async () => {
        const token = await TestHelper.signinAsAdmin()

        let user = await User.findById(USER1_ID)
        expect(user).not.toBeNull()
        expect(user?.language).toBe(TestHelper.LANGUAGE)

        const payload: bookcarsTypes.UpdateLanguagePayload = {
            id: USER1_ID,
            language: 'fr',
        }

        const res = await request(app)
            .post('/api/update-language')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)

        user = await User.findById(USER1_ID)
        expect(user).not.toBeNull()
        expect(user?.language).toBe(payload.language)

        await TestHelper.signout(token)
    })
})

describe('GET /api/user/:id', () => {
    it('should get a user', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .get(`/api/user/${USER1_ID}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)
        expect(res.body.email).toBe(USER1_EMAIL)

        await TestHelper.signout(token)
    })
})

describe('POST /api/create-avatar', () => {
    it("should create user's avatar", async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .post('/api/create-avatar')
            .set(env.X_ACCESS_TOKEN, token)
            .attach('image', AVATAR1_PATH)

        expect(res.statusCode).toBe(200)
        const filename = res.body as string
        const filePath = path.resolve(env.CDN_TEMP_USERS, filename)
        const avatarExists = await Helper.exists(filePath)
        expect(avatarExists).toBeTruthy()
        await fs.unlink(filePath)

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-avatar/:userId', () => {
    it("should update user's avatar", async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .post(`/api/update-avatar/${USER1_ID}`)
            .set(env.X_ACCESS_TOKEN, token)
            .attach('image', AVATAR2_PATH)

        expect(res.statusCode).toBe(200)
        const filename = res.body as string
        const avatarExists = await Helper.exists(path.resolve(env.CDN_USERS, filename))
        expect(avatarExists).toBeTruthy()

        const user = await User.findById(USER1_ID)
        expect(user).not.toBeNull()
        expect(user?.avatar).toBeDefined()
        expect(user?.avatar).not.toBeNull()

        await TestHelper.signout(token)
    })
})

describe('POST /api/delete-avatar/:userId', () => {
    it("should delete user's avatar", async () => {
        const token = await TestHelper.signinAsAdmin()

        let user = await User.findById(USER1_ID)
        expect(user).not.toBeNull()
        expect(user?.avatar).toBeDefined()
        expect(user?.avatar).not.toBeNull()

        const filePath = path.join(env.CDN_USERS, user?.avatar as string)
        let avatarExists = await Helper.exists(filePath)
        expect(avatarExists).toBeTruthy()

        const res = await request(app)
            .post(`/api/delete-avatar/${USER1_ID}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)
        avatarExists = await Helper.exists(filePath)
        expect(avatarExists).toBeFalsy()

        user = await User.findById(USER1_ID)
        expect(user).not.toBeNull()
        expect(user?.avatar).toBeUndefined()

        await TestHelper.signout(token)
    })
})

describe('POST /api/delete-temp-avatar/:avatar', () => {
    it('should delete temporary avatar', async () => {
        const token = await TestHelper.signinAsAdmin()

        const tempAvatar = path.join(env.CDN_TEMP_USERS, AVATAR1)
        if (!await Helper.exists(tempAvatar)) {
            fs.copyFile(AVATAR1_PATH, tempAvatar)
        }

        const res = await request(app)
            .post(`/api/delete-temp-avatar/${AVATAR1}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)
        const tempImageExists = await Helper.exists(tempAvatar)
        expect(tempImageExists).toBeFalsy()

        await TestHelper.signout(token)
    })
})

describe('POST /api/change-password', () => {
    it('should change password', async () => {
        const token = await TestHelper.signinAsAdmin()

        const newPassword = `#${TestHelper.PASSWORD}#`

        const payload: bookcarsTypes.ChangePasswordPayload = {
            _id: USER1_ID,
            password: USER1_PASSWORD,
            newPassword,
            strict: true,
        }

        const res = await request(app)
            .post('/api/change-password')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)

        USER1_PASSWORD = newPassword

        await TestHelper.signout(token)
    })
})

describe('GET /api/check-password/:id/:password', () => {
    it('should check password', async () => {
        const token = await TestHelper.signinAsAdmin()

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

        await TestHelper.signout(token)
    })
})

describe('POST /api/users/:page/:size', () => {
    it('should get users', async () => {
        const token = await TestHelper.signinAsAdmin()

        const payload: bookcarsTypes.GetUsersBody = {
            user: TestHelper.getAdminUserId(),
            types: [bookcarsTypes.UserType.Admin, bookcarsTypes.UserType.Company, bookcarsTypes.UserType.User],
        }

        const res = await request(app)
            .post(`/api/users/${TestHelper.PAGE}/${TestHelper.SIZE}`)
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)
        expect(res.body[0].resultData.length).toBeGreaterThan(3)

        await TestHelper.signout(token)
    })
})

describe('POST /api/delete-users', () => {
    it('should delete users', async () => {
        const token = await TestHelper.signinAsAdmin()

        const payload: string[] = [USER1_ID, USER2_ID, ADMIN_ID]

        let users = await User.find({ _id: { $in: payload } })
        expect(users.length).toBe(3)

        const res = await request(app)
            .post('/api/delete-users')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)

        users = await User.find({ _id: { $in: payload } })
        expect(users.length).toBe(0)

        await TestHelper.signout(token)
    })
})
