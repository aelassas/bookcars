import 'dotenv/config'
import request from 'supertest'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as testHelper from './testHelper'
import stripeAPI from '../src/stripe'

describe('POST /api/create-payment-intent', () => {
  it('should create payment intents', async () => {
    // Test create payment intent whith non existant user
    const receiptEmail = testHelper.GetRandomEmail()
    const payload: bookcarsTypes.CreatePaymentIntentPayload = {
      amount: 234,
      currency: 'usd',
      receiptEmail,
      customerName: 'John Doe',
    }
    let res = await request(app)
      .post('/api/create-payment-intent')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.paymentIntentId).not.toBeNull()
    expect(res.body.customerId).not.toBeNull()

    // Test create payment intent whith existant user
    const paymentIntent = await stripeAPI.paymentIntents.create({
      amount: payload.amount,
      currency: payload.currency,
      receipt_email: receiptEmail,
    })
    expect(paymentIntent).not.toBeNull()
    try {
      res = await request(app)
        .post('/api/create-payment-intent')
        .send(payload)
      expect(res.statusCode).toBe(200)
      expect(res.body.paymentIntentId).not.toBeNull()
      expect(res.body.customerId).not.toBeNull()
    } finally {
      const customers = await stripeAPI.customers.list({ email: receiptEmail })
      if (customers.data.length > 0) {
        for (const customer of customers.data) {
          await stripeAPI.customers.del(customer.id)
        }
      }
    }

    // Test create payment intent failure
    payload.receiptEmail = 'xxxxxxxxxxxxxxx'
    res = await request(app)
      .post('/api/create-payment-intent')
      .send(payload)
    expect(res.statusCode).toBe(400)
    expect(res.body).toStrictEqual({})
  })
})
