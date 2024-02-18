import 'dotenv/config'
import request from 'supertest'
import * as bookcarsTypes from 'bookcars-types'
import * as DatabaseHelper from '../src/common/DatabaseHelper'
import * as TestHelper from './TestHelper'
import app from '../src/app'
import * as env from '../src/config/env.config'
import User from '../src/models/User'

let SUPPLIER1_ID: string
let SUPPLIER2_ID: string
let SUPPLIER1_NAME: string

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
    if (await DatabaseHelper.Connect(false)) {
        await TestHelper.initializeDatabase()

        // create two suppliers
        SUPPLIER1_NAME = TestHelper.getSupplierName()
        const supplierName2 = TestHelper.getSupplierName()
        SUPPLIER1_ID = await TestHelper.createSupplier(`${SUPPLIER1_NAME}@test.bookcars.ma`, SUPPLIER1_NAME)
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

        let payload: bookcarsTypes.ValidateSupplierPayload = { fullName: SUPPLIER1_NAME }

        let res = await request(app)
            .post('/api/validate-supplier')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(204)

        payload = { fullName: TestHelper.getSupplierName() }

        res = await request(app)
            .post('/api/validate-supplier')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)

        await TestHelper.signout(token)
    })
})

describe('PUT /api/update-supplier', () => {
    it('should update a supplier', async () => {
        const token = await TestHelper.signinAsAdmin()

        SUPPLIER1_NAME = TestHelper.getSupplierName()
        const bio = 'bio1'
        const location = 'location1'
        const phone = '01010101'
        const payLater = false

        const payload: bookcarsTypes.UpdateSupplierPayload = {
            _id: SUPPLIER1_ID,
            fullName: SUPPLIER1_NAME,
            bio,
            location,
            phone,
            payLater,
        }

        const res = await request(app)
            .put('/api/update-supplier')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)
        expect(res.body.fullName).toBe(SUPPLIER1_NAME)
        expect(res.body.bio).toBe(bio)
        expect(res.body.location).toBe(location)
        expect(res.body.phone).toBe(phone)
        expect(res.body.payLater).toBeFalsy()

        await TestHelper.signout(token)
    })
})

describe('GET /api/supplier/:id', () => {
    it('should get a supplier', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .get(`/api/supplier/${SUPPLIER1_ID}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)
        expect(res.body.fullName).toBe(SUPPLIER1_NAME)

        await TestHelper.signout(token)
    })
})

describe('GET /api/suppliers/:page/:size', () => {
    it('should get suppliers', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .get(`/api/suppliers/${TestHelper.PAGE}/${TestHelper.SIZE}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)
        expect(res.body[0].resultData.length).toBeGreaterThan(1)

        await TestHelper.signout(token)
    })
})

describe('GET /api/all-suppliers', () => {
    it('should get all suppliers', async () => {
        const res = await request(app)
            .get('/api/all-suppliers')

        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBeGreaterThan(1)
    })
})

describe('DELETE /api/delete-supplier/:id', () => {
    it('should delete a supplier', async () => {
        const token = await TestHelper.signinAsAdmin()

        const supplierName = TestHelper.getSupplierName()
        const _id = await TestHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)

        let supplier = await User.findById(_id)
        expect(supplier).not.toBeNull()

        const res = await request(app)
            .delete(`/api/delete-supplier/${_id}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)

        supplier = await User.findById(_id)
        expect(supplier).toBeNull()

        await TestHelper.signout(token)
    })
})
