import 'dotenv/config'
import { jest } from '@jest/globals'
import request from 'supertest'
import { nanoid } from 'nanoid'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/common/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import Booking from '../src/models/Booking'
import User from '../src/models/User'
import Car from '../src/models/Car'

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  await databaseHelper.connect(env.DB_URI, false, false)
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  await databaseHelper.close()
})

describe('POST /api/create-checkout-session', () => {
  it('should create checkout session', async () => {
    await jest.resetModules()
    await jest.unstable_mockModule('../src/payment/stripe.js', () => ({
      default: {
        customers: {
          list: jest.fn(() =>
            Promise.resolve({
              data: [{ id: 'cus_123', email: receiptEmail }],
            })
          ),
          create: jest.fn(() =>
            Promise.resolve({
              id: 'cus_new_456',
              email: 'new@example.com',
              name: 'John Doe',
            })
          ),
        },
        checkout: {
          sessions: {
            create: jest.fn(() =>
              Promise.resolve({
                id: 'cs_test_123',
                status: 'open',
                url: 'https://mocked-stripe-session.com',
                client_secret: nanoid(),
              })
            ),
          },
        },
      },
    }))
    let stripeAPI = (await import('../src/payment/stripe.js')).default

    let session = await stripeAPI.checkout.sessions.create({})

    expect(session.id).toBe('cs_test_123')
    expect(stripeAPI.checkout.sessions.create).toHaveBeenCalled()

    // test success (create checkout session with non existant user)
    let receiptEmail = testHelper.GetRandomEmail()
    let payload: bookcarsTypes.CreatePaymentPayload = {
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

    // test success (create checkout session with existant user)
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
      // const customers = await stripeAPI.customers.list({ email: receiptEmail })
      // if (customers.data.length > 0) {
      //   for (const customer of customers.data) {
      //     await stripeAPI.customers.del(customer.id)
      //   }
      // }
    }

    // test success (create new user)
    await jest.resetModules()
    await jest.unstable_mockModule('../src/payment/stripe.js', () => ({
      default: {
        customers: {
          list: jest.fn(() =>
            Promise.resolve({
              data: [],
            })
          ),
          create: jest.fn(() =>
            Promise.resolve({
              id: 'cus_new_456',
              email: 'new@example.com',
              name: 'John Doe',
            })
          ),
        },
        checkout: {
          sessions: {
            create: jest.fn(() =>
              Promise.resolve({
                id: 'cs_test_123',
                status: 'open',
                url: 'https://mocked-stripe-session.com',
                client_secret: nanoid(),
              })
            ),
          },
        },
      },
    }))
    stripeAPI = (await import('../src/payment/stripe.js')).default

    session = await stripeAPI.checkout.sessions.create({})

    expect(session.id).toBe('cs_test_123')
    expect(stripeAPI.checkout.sessions.create).toHaveBeenCalled()

    // test success (create checkout session with non existant user)
    receiptEmail = testHelper.GetRandomEmail()
    res = await request(app)
      .post('/api/create-checkout-session')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.sessionId).not.toBeNull()
    expect(res.body.customerId).not.toBeNull()

    // test failure (create checkout sessions failure)
    await jest.resetModules()
    await jest.unstable_mockModule('../src/payment/stripe.js', () => ({
      default: {
        customers: {
          list: jest.fn(() =>
            Promise.reject(new Error('Stripe error'))
          ),
          create: jest.fn(() =>
            Promise.resolve({
              id: 'cus_new_456',
              email: 'new@example.com',
              name: 'John Doe',
            })
          ),
        },
        checkout: {
          sessions: {
            create: jest.fn(() =>
              Promise.resolve({
                id: 'cs_test_123',
                status: 'open',
                url: 'https://mocked-stripe-session.com',
                client_secret: nanoid(),
              })
            ),
          },
        },
      },
    }))
    stripeAPI = (await import('../src/payment/stripe.js')).default
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
    // test failure (checkout session does not exist)
    let res = await request(app)
      .post('/api/check-checkout-session/xxxxxxxxxx')
    expect(res.statusCode).toBe(204)

    // test failure (checkout session exists but booking does not exist)
    const sessionId = nanoid()
    res = await request(app)
      .post(`/api/check-checkout-session/${sessionId}`)
    expect(res.statusCode).toBe(204)

    const expireAt = new Date()
    expireAt.setSeconds(expireAt.getSeconds() + env.BOOKING_EXPIRE_AT)
    const from = new Date()
    from.setDate(from.getDate() + 1)
    const to = new Date(from)
    to.setDate(to.getDate() + 3)

    const supplierName = nanoid()
    const supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    const driver = new User({
      fullName: 'driver',
      email: testHelper.GetRandomEmail(),
      language: testHelper.LANGUAGE,
      type: bookcarsTypes.UserType.User,
    })
    await driver.save()

    const car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [testHelper.GetRandromObjectId()],
      dailyPrice: 78,
      deposit: 950,
      available: true,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      image: undefined,
      seats: 6,
      doors: 5,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: 1000,
      cancellation: 0,
      amendments: 0,
      theftProtection: 9,
      collisionDamageWaiver: 12,
      fullInsurance: 20,
      additionalDriver: 20,
      range: bookcarsTypes.CarRange.Midi,
      rating: 4,
      multimedia: [
        bookcarsTypes.CarMultimedia.AndroidAuto,
      ],
    })
    await car.save()

    const locationId = await testHelper.createLocation('location en', 'location fr', testHelper.GetRandromObjectIdAsString())

    let booking = new Booking({
      supplier: supplierId,
      car: car.id,
      driver: driver.id,
      pickupLocation: locationId,
      dropOffLocation: locationId,
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
      sessionId,
    })
    let booking2: typeof booking | undefined
    let booking3: typeof booking | undefined
    try {
      await booking.save()

      // test success
      await jest.resetModules()
      await jest.unstable_mockModule('../src/payment/stripe.js', () => ({
        default: {
          checkout: {
            sessions: {
              retrieve: jest.fn(() => Promise.resolve({ payment_status: 'paid' })),
            },
          },
        },
      }))

      let stripeAPI = (await import('../src/payment/stripe.js')).default

      await expect(stripeAPI.checkout.sessions.retrieve('123')).resolves.toStrictEqual({ payment_status: 'paid' })
      expect(stripeAPI.checkout.sessions.retrieve).toHaveBeenCalledWith('123')

      res = await request(app)
        .post(`/api/check-checkout-session/${sessionId}`)
      expect(res.statusCode).toBe(200)

      // test failure (booking not found)
      res = await request(app)
        .post(`/api/check-checkout-session/${nanoid()}`)
      expect(res.statusCode).toBe(204)

      // test success (deposit)
      await booking.deleteOne()
      booking = new Booking({
        supplier: supplierId,
        car: car.id,
        driver: driver.id,
        pickupLocation: locationId,
        dropOffLocation: locationId,
        from,
        to,
        status: bookcarsTypes.BookingStatus.Void,
        isDeposit: true,
        expireAt,
        cancellation: true,
        amendments: true,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: 312,
        additionalDriver: true,
        sessionId,
      })
      await booking.save()
      res = await request(app)
        .post(`/api/check-checkout-session/${sessionId}`)
      expect(res.statusCode).toBe(200)

      // test failure (stripe order error)
      await booking.deleteOne()
      booking = new Booking({
        supplier: supplierId,
        car: car.id,
        driver: driver.id,
        pickupLocation: locationId,
        dropOffLocation: locationId,
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
        sessionId,
      })
      await booking.save()
      await jest.resetModules()
      await jest.unstable_mockModule('../src/payment/stripe.js', () => ({
        default: {
          checkout: {
            sessions: {
              retrieve: jest.fn(() => Promise.reject(new Error('Simulated error'))),
            },
          },
        },
      }))

      stripeAPI = (await import('../src/payment/stripe.js')).default

      await expect(stripeAPI.checkout.sessions.retrieve('123')).rejects.toThrow('Simulated error')
      expect(stripeAPI.checkout.sessions.retrieve).toHaveBeenCalledWith('123')

      res = await request(app)
        .post(`/api/check-checkout-session/${sessionId}`)
      expect(res.statusCode).toBe(204)
      await jest.resetModules()

      // test failure (booking exists, order does not exist)
      res = await request(app)
        .post(`/api/check-checkout-session/${sessionId}`)
      expect(res.statusCode).toBe(204)

      // test failure (payment canceled)
      // res = await request(app)
      //   .post('/api/create-checkout-session')
      //   .send(payload)
      // expect(res.statusCode).toBe(200)
      // const { sessionId: sessionId2 } = res.body
      const sessionId2 = nanoid()
      booking2 = new Booking({
        supplier: supplierId,
        car: car.id,
        driver: driver.id,
        pickupLocation: locationId,
        dropOffLocation: locationId,
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
        sessionId: sessionId2,
      })
      await booking2.save()
      await jest.resetModules()
      await jest.unstable_mockModule('../src/payment/stripe.js', () => ({
        default: {
          checkout: {
            sessions: {
              retrieve: jest.fn(() => Promise.resolve({ payment_status: 'canceled' })),
            },
          },
        },
      }))

      stripeAPI = (await import('../src/payment/stripe.js')).default

      await expect(stripeAPI.checkout.sessions.retrieve('123')).resolves.toStrictEqual({ payment_status: 'canceled' })
      expect(stripeAPI.checkout.sessions.retrieve).toHaveBeenCalledWith('123')

      res = await request(app)
        .post(`/api/check-checkout-session/${sessionId2}`)
      expect(res.statusCode).toBe(400)
      const b = await Booking.findById(booking2.id)
      expect(b).toBeFalsy()
      booking2 = undefined
      await jest.resetModules()

      // test failure (missing members)
      const sessionId3 = nanoid()
      booking3 = new Booking({
        supplier: supplierId,
        car: testHelper.GetRandromObjectId(),
        driver: driver.id,
        pickupLocation: locationId,
        dropOffLocation: locationId,
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
        sessionId: sessionId3,
      })
      await booking3.save()
      await jest.resetModules()
      await jest.unstable_mockModule('../src/payment/stripe.js', () => ({
        default: {
          checkout: {
            sessions: {
              retrieve: jest.fn(() => Promise.resolve({ payment_status: 'paid' })),
            },
          },
        },
      }))

      stripeAPI = (await import('../src/payment/stripe.js')).default

      await expect(stripeAPI.checkout.sessions.retrieve('123')).resolves.toStrictEqual({ payment_status: 'paid' })
      expect(stripeAPI.checkout.sessions.retrieve).toHaveBeenCalledWith('123')

      // car missing
      res = await request(app)
        .post(`/api/check-checkout-session/${sessionId3}`)
      expect(res.statusCode).toBe(400)
      // supplier missing
      await booking3.deleteOne()
      booking3 = new Booking({
        supplier: testHelper.GetRandromObjectId(),
        car: car.id,
        driver: driver.id,
        pickupLocation: locationId,
        dropOffLocation: locationId,
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
        sessionId: sessionId3,
      })
      await booking3.save()
      res = await request(app)
        .post(`/api/check-checkout-session/${sessionId3}`)
      expect(res.statusCode).toBe(400)
      // driver missing
      await booking3.deleteOne()
      booking3 = new Booking({
        supplier: supplierId,
        car: car.id,
        driver: testHelper.GetRandromObjectId(),
        pickupLocation: locationId,
        dropOffLocation: locationId,
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
        sessionId: sessionId3,
      })
      await booking3.save()
      res = await request(app)
        .post(`/api/check-checkout-session/${sessionId3}`)
      expect(res.statusCode).toBe(400)
      // pickupLocation missing
      await booking3.deleteOne()
      booking3 = new Booking({
        supplier: supplierId,
        car: car.id,
        driver: driver,
        pickupLocation: testHelper.GetRandromObjectId(),
        dropOffLocation: locationId,
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
        sessionId: sessionId3,
      })
      await booking3.save()
      res = await request(app)
        .post(`/api/check-checkout-session/${sessionId3}`)
      expect(res.statusCode).toBe(400)
      await jest.resetModules()
    } catch (err) {
      console.error(err)
      throw new Error(`Error during /api/check-checkout-session/: ${err}`)
    } finally {
      await booking.deleteOne()
      if (booking2) {
        await booking2.deleteOne()
      }
      if (booking3) {
        await booking3.deleteOne()
      }
      await car.deleteOne()
      await driver.deleteOne()
      await testHelper.deleteLocation(locationId)
      await testHelper.deleteSupplier(supplierId)
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
    await jest.resetModules()
    const receiptEmail = testHelper.GetRandomEmail()
    await jest.unstable_mockModule('../src/payment/stripe.js', () => ({
      default: {
        customers: {
          list: jest.fn(() =>
            Promise.resolve({
              data: [{ id: 'cus_123', email: receiptEmail }],
            })
          ),
          create: jest.fn(() =>
            Promise.resolve({
              id: 'cus_new_456',
              email: 'new@example.com',
              name: 'John Doe',
            })
          ),
        },
        paymentIntents: {
          create: jest.fn(() =>
            Promise.resolve({
              id: 'pi_123456',
              status: 'succeeded',
              clientSecret: nanoid(),
            })
          ),
        },
      },
    }))
    let stripeAPI = (await import('../src/payment/stripe.js')).default

    let customer = await stripeAPI.customers.create({
      email: 'new@example.com',
      name: 'John Doe',
    })

    expect(customer.id).toBe('cus_new_456')
    expect(stripeAPI.customers.create).toHaveBeenCalled()

    //
    // Test create payment intent with non existant user
    //
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
    // Test create payment intent with existant user
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
      // const customers = await stripeAPI.customers.list({ email: receiptEmail })
      // if (customers.data.length > 0) {
      //   for (const customer of customers.data) {
      //     await stripeAPI.customers.del(customer.id)
      //   }
      // }
    }

    //
    // Test success (create user)
    //
    await jest.resetModules()
    await jest.unstable_mockModule('../src/payment/stripe.js', () => ({
      default: {
        customers: {
          list: jest.fn(() =>
            Promise.resolve({
              data: [],
            })
          ),
          create: jest.fn(() =>
            Promise.resolve({
              id: 'cus_new_456',
              email: 'new@example.com',
              name: 'John Doe',
            })
          ),
        },
        paymentIntents: {
          create: jest.fn(() =>
            Promise.resolve({
              id: 'pi_123456',
              status: 'succeeded',
              clientSecret: nanoid(),
            })
          ),
        },
      },
    }))
    stripeAPI = (await import('../src/payment/stripe.js')).default

    customer = await stripeAPI.customers.create({
      email: 'new@example.com',
      name: 'John Doe',
    })

    expect(customer.id).toBe('cus_new_456')
    expect(stripeAPI.customers.create).toHaveBeenCalled()
    res = await request(app)
      .post('/api/create-payment-intent')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.paymentIntentId).not.toBeNull()
    expect(res.body.customerId).not.toBeNull()

    //
    // Test create payment intent failure
    //
    await jest.resetModules()
    await jest.unstable_mockModule('../src/payment/stripe.js', () => ({
      default: {
        customers: {
          list: jest.fn(() =>
            Promise.reject(new Error('Stripe Error'))
          ),
          create: jest.fn(() =>
            Promise.resolve({
              id: 'cus_new_456',
              email: 'new@example.com',
              name: 'John Doe',
            })
          ),
        },
        paymentIntents: {
          create: jest.fn(() =>
            Promise.resolve({
              id: 'pi_123456',
              status: 'succeeded',
              clientSecret: nanoid(),
            })
          ),
        },
      },
    }))
    stripeAPI = (await import('../src/payment/stripe.js')).default

    payload.receiptEmail = 'xxxxxxxxxxxxxxx'
    res = await request(app)
      .post('/api/create-payment-intent')
      .send(payload)
    expect(res.statusCode).toBe(400)
    expect(res.body).toStrictEqual({})
  })
})
