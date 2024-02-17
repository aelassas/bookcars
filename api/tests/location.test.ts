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

describe('POST /api/validate-location', () => {
    it('should validate a location', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/create-location', () => {
    it('should create a location', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-location/:id', () => {
    it('should update a location', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/location/:id/:language', () => {
    it('should get a location', async () => {

        // TODO

    })
})

describe('GET /api/locations/:page/:size/:language', () => {
    it('should get locations', async () => {

        // TODO

    })
})

describe('GET /api/check-location/:id', () => {
    it('should check a location', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('DELETE /api/delete-location/:id', () => {
    it('should delete a location', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})
