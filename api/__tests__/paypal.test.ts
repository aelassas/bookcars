import 'dotenv/config'
import request from 'supertest'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/common/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import Booking from '../src/models/Booking'

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  const res = await databaseHelper.connect(env.DB_URI, false, false)
  expect(res).toBeTruthy()
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  await databaseHelper.close()
})

describe('POST /api/create-paypal-order', () => {
  it('should create paypal order', async () => {
    // test success (create checkout session whith non existant user)
    const payload: bookcarsTypes.CreatePayPalOrderPayload = {
      amount: 234,
      currency: 'USD',
      name: 'BMW X1',
      bookingId: testHelper.GetRandromObjectIdAsString(),
    }
    let res = await request(app)
      .post('/api/create-paypal-order')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    // test failure (create checkout sessions failure)
    payload.currency = 'xxxxxxxxxxxxxxx'
    res = await request(app)
    .post('/api/create-paypal-order')
      .send(payload)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/check-paypal-order/:bookingId/:orderId', () => {
  it('should check paypal order', async () => {
    // test failure (order exists, booking exists and payment failed)
    const expireAt = new Date()
    expireAt.setSeconds(expireAt.getSeconds() + env.BOOKING_EXPIRE_AT)
    const from = new Date()
    from.setDate(from.getDate() + 1)
    const to = new Date(from)
    to.setDate(to.getDate() + 3)

    const booking = new Booking({
      supplier: testHelper.GetRandromObjectId(),
      car: testHelper.GetRandromObjectId(),
      driver: testHelper.GetRandromObjectId(),
      pickupLocation: testHelper.GetRandromObjectId(),
      dropOffLocation: testHelper.GetRandromObjectId(),
      from,
      to,
      status: bookcarsTypes.BookingStatus.Void,
      expireAt,
      cancellation: true,
      amendments: true,
      theftProtection: false,
      collisionDamageWaiver: false,
      fullInsurance: false,
      price: 312,
      additionalDriver: true,
    })
    try {
      await booking.save()

      const payload: bookcarsTypes.CreatePayPalOrderPayload = {
        amount: booking.price,
        currency: 'USD',
        name: 'BMW X1',
        bookingId: booking.id,
      }
      let res = await request(app)
        .post('/api/create-paypal-order')
        .send(payload)
      expect(res.statusCode).toBe(200)
      expect(res.body.length).toBeGreaterThan(0)
      const orderId = res.body

      res = await request(app)
        .post(`/api/check-paypal-order/${booking.id}/${orderId}`)
      expect(res.statusCode).toBe(400)

      // test failure (booking exists, order does not exist)
      res = await request(app)
        .post(`/api/check-paypal-order/${booking.id}/${testHelper.GetRandromObjectIdAsString()}`)
      expect(res.statusCode).toBe(204)
    } catch (err) {
      console.error(err)
    } finally {
      await booking.deleteOne()
    }

    // test failure (booking does not exist)
    let res = await request(app)
      .post(`/api/check-paypal-order/${testHelper.GetRandromObjectIdAsString()}/${testHelper.GetRandromObjectIdAsString()}`)
    expect(res.statusCode).toBe(204)

    // test failure (lost db connection)
    try {
      databaseHelper.close()
      res = await request(app)
        .post(`/api/check-paypal-order/${testHelper.GetRandromObjectIdAsString()}/${testHelper.GetRandromObjectIdAsString()}`)
      expect(res.statusCode).toBe(400)
    } catch (err) {
      console.error(err)
    } finally {
      const dbRes = await databaseHelper.connect(env.DB_URI, false, false)
      expect(dbRes).toBeTruthy()
    }
  })
})
