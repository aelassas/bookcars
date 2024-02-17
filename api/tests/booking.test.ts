import 'dotenv/config'
import * as DatabaseHelper from '../src/common/DatabaseHelper'
import * as TestHelper from './TestHelper'

let SUPPLIER_ID: string
let LOCATION_ID: string

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
    if (await DatabaseHelper.Connect(false)) {
        await TestHelper.initializeDatabase()

        // create a supplier
        const supplierName = TestHelper.getSupplierName()
        SUPPLIER_ID = await TestHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)

        // create a location
        LOCATION_ID = await TestHelper.createLocation('Location 1 EN', 'Location 1 FR')
    }
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
    await TestHelper.clearDatabase()

    // delete the supplier
    await TestHelper.deleteSupplier(SUPPLIER_ID)

    // delete the location
    await TestHelper.deleteLocation(LOCATION_ID)

    await DatabaseHelper.Close(false)
})

//
// Unit tests
//

describe('POST /api/create-booking', () => {
    it('should create a booking', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/book', () => {
    it('should checkout', async () => {
        const token = await TestHelper.signinAsUser()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-booking', () => {
    it('should update a booking', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-booking-status', () => {
    it('should update booking status', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/booking/:id/:language', () => {
    it('should get a booking', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/bookings/:page/:size/:language', () => {
    it('should get bookings', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/has-bookings/:driver', () => {
    it("should check driver's bookings", async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('POST /api/cancel-booking/:driver', () => {
    it('should cancel a booking', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('DELETE /api/delete-bookings', () => {
    it('should delete bookings', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})
