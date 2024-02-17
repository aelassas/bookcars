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

// TODO Add remaining tests
