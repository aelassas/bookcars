import 'dotenv/config'
import * as DatabaseHelper from '../src/common/DatabaseHelper'
import * as TestHelper from './TestHelper'

let SUPPLIER1_ID: string
let SUPPLIER2_ID: string

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
    if (await DatabaseHelper.Connect(false)) {
        await TestHelper.initializeDatabase()

        // create two suppliers
        const supplierName1 = TestHelper.getSupplierName()
        const supplierName2 = TestHelper.getSupplierName()
        SUPPLIER1_ID = await TestHelper.createSupplier(`${supplierName1}@test.bookcars.ma`, supplierName1)
        SUPPLIER2_ID = await TestHelper.createSupplier(`${supplierName2}@test.bookcars.ma`, supplierName2)
    }
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
    await TestHelper.clearDatabase()

    // delete suppliers
    await TestHelper.deleteSupplier(SUPPLIER1_ID)
    await TestHelper.deleteSupplier(SUPPLIER2_ID)

    await DatabaseHelper.Close(false)
})

//
// Unit tests
//

describe('POST /api/validate-supplier', () => {
    it('should validate a supplier', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('PUT /api/update-supplier', () => {
    it('should update a supplier', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/supplier/:id', () => {
    it('should get a supplier', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/suppliers/:page/:size', () => {
    it('should get suppliers', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})

describe('GET /api/all-suppliers', () => {
    it('should get all suppliers', async () => {

        // TODO

    })
})

describe('DELETE /api/delete-supplier/:id', () => {
    it('should delete a supplier', async () => {
        const token = await TestHelper.signinAsAdmin()

        // TODO

        await TestHelper.signout(token)
    })
})
