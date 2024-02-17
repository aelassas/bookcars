import 'dotenv/config'
import * as DatabaseHelper from '../src/common/DatabaseHelper'
import * as TestHelper from './TestHelper'

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

    await DatabaseHelper.Close(false)
})

//
// Unit tests
//

describe('POST /api/sign-up', () => {
    it('should create a user', async () => {

        // TODO

    })
})

describe('POST /api/admin-sign-up', () => {
    it('should create an admin user', async () => {

        // TODO

    })
})

describe('POST /api/create-user', () => {
    it('should create a user', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/check-token/:type/:userId/:email/:token', () => {
    it("should check user's token", async () => {

        // TODO

    })
})

describe('DELETE /api/delete-tokens/:userId', () => {
    it("should delete user's tokens", async () => {

        // TODO

    })
})

describe('POST /api/resend/:type/:email/:reset', () => {
    it('should resend validation email', async () => {

        // TODO

    })
})

describe('POST /api/activate', () => {
    it("should activate user's account", async () => {

        // TODO

    })
})

describe('POST /api/sign-in/:type', () => {
    it('should sign in', async () => {

        // TODO

    })
})

describe('POST /api/sign-out', () => {
    it('should sign out', async () => {

        // TODO

    })
})

describe('POST /api/create-push-token/:userId/:token', () => {
    it('should create push token', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/push-token/:userId', () => {
    it('should get push token', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/delete-push-token/:userId', () => {
    it('should delete push token', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/validate-email', () => {
    it('should validate email', async () => {

        // TODO

    })
})

describe('POST /api/validate-access-token', () => {
    it('should validate access token', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/confirm-email/:email/:token', () => {
    it('should send confirmation email', async () => {

        // TODO

    })
})

describe('POST /api/resend-link', () => {
    it('should resend activation link', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-user', () => {
    it('should update user', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-email-notifications', () => {
    it('should update email notifications setting', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-language', () => {
    it("should update user's language", async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/user/:id', () => {
    it('should get a user', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/create-avatar', () => {
    it("should create user's avatar", async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-avatar/:userId', () => {
    it("should update user's avatar", async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/delete-avatar/:userId', () => {
    it("should delete user's avatar", async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/delete-temp-avatar/:avatar', () => {
    it('should delete temporary avatar', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/change-password', () => {
    it('should change password', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/check-password/:id/:password', () => {
    it('should check password', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/users/:page/:size', () => {
    it('should get users', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/delete-users', () => {
    it('should delete users', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})
