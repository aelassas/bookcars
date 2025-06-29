import 'dotenv/config'
import { jest } from '@jest/globals'
import request from 'supertest'
import { nanoid } from 'nanoid'
import * as bookcarsTypes from ':bookcars-types'
import * as databaseHelper from '../src/common/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import Booking from '../src/models/Booking'
import app from '../src/app'
import Car from '../src/models/Car'
import User from '../src/models/User'

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

describe('POST /api/create-paypal-order', () => {
  it('should create paypal order', async () => {
    await jest.resetModules()

    await jest.unstable_mockModule('../src/payment/paypal.js', () => ({
      getOrder: jest.fn(),
      getToken: jest.fn(() => Promise.resolve('mock-token')),
      createOrder: jest.fn(() => Promise.resolve('ORDER-MOCK-123')),
    }))
    let paypal = await import('../src/payment/paypal.js')
    const orderId = await paypal.createOrder('booking123', 100, 'USD', 'Test Name', 'Test Description', 'US')

    expect(orderId).toBe('ORDER-MOCK-123')
    expect(paypal.createOrder).toHaveBeenCalledWith(
      'booking123',
      100,
      'USD',
      'Test Name',
      'Test Description',
      'US'
    )

    // test success (create paypal order whith non existant user)
    const payload: bookcarsTypes.CreatePayPalOrderPayload = {
      amount: 234,
      currency: 'USD',
      name: 'BMW X1',
      description: 'BMW X1',
      bookingId: testHelper.GetRandromObjectIdAsString(),
    }
    let res = await request(app)
      .post('/api/create-paypal-order')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    // test failure (create paypal order failure)
    await jest.resetModules()

    await jest.unstable_mockModule('../src/payment/paypal.js', () => ({
      getOrder: jest.fn(),
      getToken: jest.fn(() => Promise.resolve('mock-token')),
      createOrder: jest.fn(() => Promise.reject(new Error('Simulated error'))),
    }))
    paypal = await import('../src/payment/paypal.js')
    await expect(paypal.createOrder('booking123', 100, 'USD', 'Test Name', 'Test Description', 'US')).rejects.toThrow('Simulated error')

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
    })
    let booking2: typeof booking | undefined
    let booking3: typeof booking | undefined
    try {
      await booking.save()

      const orderId = nanoid()

      // test success
      await jest.resetModules()
      await jest.unstable_mockModule('../src/payment/paypal.js', () => ({
        getOrder: jest.fn(() => Promise.resolve({ status: 'COMPLETED' })),
        getToken: jest.fn(() => Promise.resolve('fake-token')),
        createOrder: jest.fn(),
      }))

      let paypal = await import('../src/payment/paypal.js')

      await expect(paypal.getOrder('123')).resolves.toStrictEqual({ status: 'COMPLETED' })
      expect(paypal.getOrder).toHaveBeenCalledWith('123')

      let res = await request(app)
        .post(`/api/check-paypal-order/${booking.id}/${orderId}`)
      expect(res.statusCode).toBe(200)

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
      })
      await booking.save()
      res = await request(app)
        .post(`/api/check-paypal-order/${booking.id}/${orderId}`)
      expect(res.statusCode).toBe(200)

      // test failure (paypal order error)
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
      })
      await booking.save()
      await jest.resetModules()
      await jest.unstable_mockModule('../src/payment/paypal.js', () => ({
        getOrder: jest.fn(() => Promise.reject(new Error('Simulated error'))),
        getToken: jest.fn(() => Promise.resolve('fake-token')),
        createOrder: jest.fn(),
      }))

      paypal = await import('../src/payment/paypal.js')

      await expect(paypal.getOrder('123')).rejects.toThrow('Simulated error')
      expect(paypal.getOrder).toHaveBeenCalledWith('123')

      res = await request(app)
        .post(`/api/check-paypal-order/${booking.id}/${orderId}`)
      expect(res.statusCode).toBe(204)
      await jest.resetModules()

      // test failure (booking exists, order does not exist)
      res = await request(app)
        .post(`/api/check-paypal-order/${booking.id}/${testHelper.GetRandromObjectIdAsString()}`)
      expect(res.statusCode).toBe(204)

      // test failure (payment expired)
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
      })
      await booking2.save()
      await jest.resetModules()
      await jest.unstable_mockModule('../src/payment/paypal.js', () => ({
        getOrder: jest.fn(() => Promise.resolve({ status: 'EXPIRED' })),
        getToken: jest.fn(() => Promise.resolve('fake-token')),
        createOrder: jest.fn(),
      }))

      paypal = await import('../src/payment/paypal.js')

      await expect(paypal.getOrder('123')).resolves.toStrictEqual({ status: 'EXPIRED' })
      expect(paypal.getOrder).toHaveBeenCalledWith('123')

      res = await request(app)
        .post(`/api/check-paypal-order/${booking2.id}/${orderId}`)
      expect(res.statusCode).toBe(400)
      const b = await Booking.findById(booking2.id)
      expect(b).toBeFalsy()
      booking2 = undefined
      await jest.resetModules()

      // test failure (missing members)
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
      })
      await booking3.save()
      await jest.resetModules()
      await jest.unstable_mockModule('../src/payment/paypal.js', () => ({
        getOrder: jest.fn(() => Promise.resolve({ status: 'COMPLETED' })),
        getToken: jest.fn(() => Promise.resolve('fake-token')),
        createOrder: jest.fn(),
      }))

      paypal = await import('../src/payment/paypal.js')

      await expect(paypal.getOrder('123')).resolves.toStrictEqual({ status: 'COMPLETED' })
      expect(paypal.getOrder).toHaveBeenCalledWith('123')

      // car missing
      res = await request(app)
        .post(`/api/check-paypal-order/${booking3.id}/${orderId}`)
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
      })
      await booking3.save()
      res = await request(app)
        .post(`/api/check-paypal-order/${booking3.id}/${orderId}`)
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
      })
      await booking3.save()
      res = await request(app)
        .post(`/api/check-paypal-order/${booking3.id}/${orderId}`)
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
      })
      await booking3.save()
      res = await request(app)
        .post(`/api/check-paypal-order/${booking3.id}/${orderId}`)
      expect(res.statusCode).toBe(400)
      await jest.resetModules()
    } catch (err) {
      console.error(err)
      throw new Error(`Error during /api/check-paypal-order/: ${err}`)
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
