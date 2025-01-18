import 'dotenv/config'
import request from 'supertest'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/common/databaseHelper'
import * as testHelper from './testHelper'
import stripeAPI from '../src/stripe'
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

describe('POST /api/create-checkout-session', () => {
  it('should create checkout session', async () => {
    // test success (create checkout session whith non existant user)
    const receiptEmail = testHelper.GetRandomEmail()
    const payload: bookcarsTypes.CreatePaymentPayload = {
      amount: 234,
      currency: 'usd',
      receiptEmail,
      customerName: 'John Doe',
      locale: 'en',
      name: 'BMW X1',
      description: 'BookCars Testing Service',
    }
    let res = await request(app)
      .post('/api/create-checkout-session')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.sessionId).not.toBeNull()
    expect(res.body.customerId).not.toBeNull()

    // test success (create checkout session whith existant user)
    try {
      res = await request(app)
        .post('/api/create-checkout-session')
        .send(payload)
      expect(res.statusCode).toBe(200)
      expect(res.body.sessionId).not.toBeNull()
      expect(res.body.customerId).not.toBeNull()
    } catch (err) {
      console.error(err)
    } finally {
      const customers = await stripeAPI.customers.list({ email: receiptEmail })
      if (customers.data.length > 0) {
        for (const customer of customers.data) {
          await stripeAPI.customers.del(customer.id)
        }
      }
    }

    // test failure (create checkout sessions failure)
    payload.receiptEmail = 'xxxxxxxxxxxxxxx'
    res = await request(app)
      .post('/api/create-checkout-session')
      .send(payload)
    expect(res.statusCode).toBe(400)
    expect(res.body).toStrictEqual({})
  })
})

describe('POST /api/check-checkout-session/:sessionId', () => {
  it('should check checkout session', async () => {
    // test success (checkout session does not exist)
    let res = await request(app)
      .post('/api/check-checkout-session/xxxxxxxxxx')
    expect(res.statusCode).toBe(204)

    // test success (checkout session exists but booking does not exist)
    const receiptEmail = testHelper.GetRandomEmail()
    const payload: bookcarsTypes.CreatePaymentPayload = {
      amount: 234,
      currency: 'usd',
      receiptEmail,
      customerName: 'John Doe',
      locale: 'en',
      name: 'BMW X1',
      description: 'BookCars Testing Service',
    }
    res = await request(app)
      .post('/api/create-checkout-session')
      .send(payload)
    expect(res.statusCode).toBe(200)
    const { sessionId } = res.body
    expect(sessionId).not.toBeNull()
    expect(res.body.customerId).not.toBeNull()
    res = await request(app)
      .post(`/api/check-checkout-session/${sessionId}`)
    expect(res.statusCode).toBe(204)

    // test failure (checkout session exists and booking exists and payment failed)
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
      sessionId,
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

      res = await request(app)
        .post(`/api/check-checkout-session/${sessionId}`)
      expect(res.statusCode).toBe(400)
    } catch (err) {
      console.error(err)
    } finally {
      await booking.deleteOne()
    }

    // test failure (lost db connection)
    try {
      databaseHelper.close()
      res = await request(app)
        .post(`/api/check-checkout-session/${sessionId}`)
      expect(res.statusCode).toBe(400)
    } catch (err) {
      console.error(err)
    } finally {
      const dbRes = await databaseHelper.connect(env.DB_URI, false, false)
      expect(dbRes).toBeTruthy()
    }
  })
})

describe('POST /api/create-payment-intent', () => {
  it('should create payment intents', async () => {
    //
    // Test create payment intent whith non existant user
    //
    const receiptEmail = testHelper.GetRandomEmail()
    const payload: bookcarsTypes.CreatePaymentPayload = {
      amount: 234,
      currency: 'usd',
      receiptEmail,
      customerName: 'John Doe',
      locale: 'en',
      name: 'BookCars Testing Service',
      description: '',
    }
    let res = await request(app)
      .post('/api/create-payment-intent')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.paymentIntentId).not.toBeNull()
    expect(res.body.customerId).not.toBeNull()

    //
    // Test create payment intent whith existant user
    //
    try {
      res = await request(app)
        .post('/api/create-payment-intent')
        .send(payload)
      expect(res.statusCode).toBe(200)
      expect(res.body.paymentIntentId).not.toBeNull()
      expect(res.body.customerId).not.toBeNull()
    } catch (err) {
      console.error(err)
    } finally {
      const customers = await stripeAPI.customers.list({ email: receiptEmail })
      if (customers.data.length > 0) {
        for (const customer of customers.data) {
          await stripeAPI.customers.del(customer.id)
        }
      }
    }

    //
    // Test create payment intent failure
    //
    payload.receiptEmail = 'xxxxxxxxxxxxxxx'
    res = await request(app)
      .post('/api/create-payment-intent')
      .send(payload)
    expect(res.statusCode).toBe(400)
    expect(res.body).toStrictEqual({})
  })
})
