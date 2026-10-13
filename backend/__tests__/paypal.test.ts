import 'dotenv/config'
import { jest } from '@jest/globals'
import request from 'supertest'
import { nanoid } from 'nanoid'
import * as bookcarsTypes from ':bookcars-types'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import Booking from '../src/models/Booking'
import Car from '../src/models/Car'
import User from '../src/models/User'
import Notification from '../src/models/Notification'
import NotificationCounter from '../src/models/NotificationCounter'

//
// Configuration des mocks ESM avant l'importation de l'application
//
const mockGetOrder = jest.fn<(...args: any[]) => Promise<any>>()
const mockCreateOrder = jest.fn<(...args: any[]) => Promise<any>>()

await jest.unstable_mockModule('../src/payment/paypal.js', () => ({
  getOrder: mockGetOrder,
  getToken: jest.fn(() => Promise.resolve('fake-token')),
  createOrder: mockCreateOrder,
}))

const { default: app } = await import('../src/app')
const paypal = await import('../src/payment/paypal.js')

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
    mockCreateOrder.mockImplementation(() => Promise.resolve('ORDER-MOCK-123'))

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

    // Create a real booking record to verify server-side price lookup
    const booking = new Booking({
      supplier: testHelper.GetRandromObjectId(),
      car: testHelper.GetRandromObjectId(),
      driver: testHelper.GetRandromObjectId(),
      pickupLocation: testHelper.GetRandromObjectId(),
      dropOffLocation: testHelper.GetRandromObjectId(),
      from: new Date(),
      to: new Date(),
      status: bookcarsTypes.BookingStatus.Void,
      price: 234,
    })
    await booking.save()

    // test success (create paypal order)
    const payload: bookcarsTypes.CreatePayPalOrderPayload = {
      amount: 1, // Client sends manipulated amount, server uses booking.price (234)
      currency: 'USD',
      name: 'BMW X1',
      description: 'BMW X1',
      bookingId: booking._id.toString(),
    }
    let res = await request(app)
      .post('/api/create-paypal-order')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    expect(paypal.createOrder).toHaveBeenCalledWith(
      bookingForOrder._id.toString(),
      234,
      'USD',
      'BMW X1',
      'BMW X1',
      expect.any(String),
    )

    // test non-existent booking
    const nonExistentRes = await request(app)
      .post('/api/create-paypal-order')
      .send({ ...payload, bookingId: testHelper.GetRandromObjectIdAsString() })
    expect(nonExistentRes.statusCode).toBe(204)

    // test failure (create paypal order with non-existent booking)
    payload.bookingId = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/create-paypal-order')
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test failure (create paypal order failure)
    mockCreateOrder.mockImplementation(() => Promise.reject(new Error('Simulated error')))

    await expect(paypal.createOrder('booking123', 100, 'USD', 'Test Name', 'Test Description', 'US')).rejects.toThrow('Simulated error')

    payload.bookingId = booking._id.toString()
    payload.currency = 'xxxxxxxxxxxxxxx'
    res = await request(app)
      .post('/api/create-paypal-order')
      .send(payload)
    expect(res.statusCode).toBe(400)

    await booking.deleteOne()
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

    const createTestCar = async () => {
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
      return car
    }

    const car = await createTestCar()
    const carDeposit = await createTestCar()
    const carError = await createTestCar()
    const carExpired = await createTestCar()
    const carMissingMembers = await createTestCar()

    const locationId = await testHelper.createLocation('location en', 'location fr', testHelper.GetRandromObjectIdAsString())

    let booking = new Booking({
      supplier: supplierId,
      car: car._id.toString(),
      driver: driver._id.toString(),
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

      const mockPayPalOrder = (overrides = {}, unitOverrides = {}) => ({
        status: 'COMPLETED',
        purchase_units: [
          {
            invoice_id: booking._id.toString(),
            amount: {
              value: '312.00',
              currency_code: 'USD',
            },
            payments: {
              captures: [{ id: 'CAPTURE-123' }],
            },
            ...unitOverrides,
          },
        ],
        ...overrides,
      })

      // test success
      mockGetOrder.mockImplementation(() => Promise.resolve(mockPayPalOrder()))

      await expect(paypal.getOrder('123')).resolves.toStrictEqual(mockPayPalOrder())
      expect(paypal.getOrder).toHaveBeenCalledWith('123')

      let res = await request(app)
        .post(`/api/check-paypal-order/${booking._id.toString()}/${orderId}`)
      expect(res.statusCode).toBe(200)
      await testHelper.deleteNotifications(booking._id.toString())

      // test failure (price mismatch)
      await booking.deleteOne()
      booking = new Booking({
        supplier: supplierId,
        car: car._id.toString(),
        driver: driver._id.toString(),
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

      mockGetOrder.mockImplementation(() => Promise.resolve(mockPayPalOrder({}, {
        invoice_id: booking._id.toString(),
        amount: { value: '1.00', currency_code: 'USD' },
      })))

      res = await request(app)
        .post(`/api/check-paypal-order/${booking._id.toString()}/${orderId}`)
      expect(res.statusCode).toBe(400)
      expect(res.text).toBe('Payment amount mismatch')

      // test failure (invoice id / booking id mismatch)
      mockGetOrder.mockImplementation(() => Promise.resolve(mockPayPalOrder({}, {
        invoice_id: testHelper.GetRandromObjectIdAsString(),
      })))

      res = await request(app)
        .post(`/api/check-paypal-order/${booking._id.toString()}/${orderId}`)
      expect(res.statusCode).toBe(400)
      expect(res.text).toBe('Booking ID mismatch')

      // test success (deposit)
      await booking.deleteOne()
      booking = new Booking({
        supplier: supplierId,
        car: carDeposit._id.toString(),
        driver: driver._id.toString(),
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

      mockGetOrder.mockImplementation(() => Promise.resolve(mockPayPalOrder({}, {
        invoice_id: booking._id.toString(),
      })))

      res = await request(app)
        .post(`/api/check-paypal-order/${booking._id.toString()}/${orderId}`)
      expect(res.statusCode).toBe(200)
      await testHelper.deleteNotifications(booking._id.toString())

      // test failure (paypal order error)
      await booking.deleteOne()
      booking = new Booking({
        supplier: supplierId,
        car: carError._id.toString(),
        driver: driver._id.toString(),
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

      mockGetOrder.mockImplementation(() => Promise.reject(new Error('Simulated error')))

      await expect(paypal.getOrder('123')).rejects.toThrow('Simulated error')
      expect(paypal.getOrder).toHaveBeenCalledWith('123')

      res = await request(app)
        .post(`/api/check-paypal-order/${booking._id.toString()}/${orderId}`)
      expect(res.statusCode).toBe(204)

      // test failure (booking exists, order does not exist)
      mockGetOrder.mockImplementation(() => Promise.resolve(undefined))

      res = await request(app)
        .post(`/api/check-paypal-order/${booking._id.toString()}/${testHelper.GetRandromObjectIdAsString()}`)
      expect(res.statusCode).toBe(204)

      // test failure (payment expired)
      booking2 = new Booking({
        supplier: supplierId,
        car: carExpired._id.toString(),
        driver: driver._id.toString(),
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

      mockGetOrder.mockImplementation(() => Promise.resolve(mockPayPalOrder(
        { status: 'EXPIRED' },
        { invoice_id: booking2!._id.toString() }
      )))

      res = await request(app)
        .post(`/api/check-paypal-order/${booking2._id.toString()}/${orderId}`)
      expect(res.statusCode).toBe(400)
      const b = await Booking.findById(booking2._id.toString())
      expect(b).toBeFalsy()
      booking2 = undefined

      // test failure (missing members)
      booking3 = new Booking({
        supplier: supplierId,
        car: testHelper.GetRandromObjectId(),
        driver: driver._id.toString(),
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

      mockGetOrder.mockImplementation(() => Promise.resolve(mockPayPalOrder(
        {},
        { invoice_id: booking3!._id.toString() }
      )))

      await expect(paypal.getOrder('123')).resolves.toStrictEqual(mockPayPalOrder({}, { invoice_id: booking3._id.toString() }))
      expect(paypal.getOrder).toHaveBeenCalledWith('123')

      // car missing
      res = await request(app)
        .post(`/api/check-paypal-order/${booking3._id.toString()}/${orderId}`)
      expect(res.statusCode).toBe(400)

      // supplier missing
      await booking3.deleteOne()
      booking3 = new Booking({
        supplier: testHelper.GetRandromObjectId(),
        car: carMissingMembers._id.toString(),
        driver: driver._id.toString(),
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

      mockGetOrder.mockImplementation(() => Promise.resolve(mockPayPalOrder(
        {},
        { invoice_id: booking3!._id.toString() }
      )))

      res = await request(app)
        .post(`/api/check-paypal-order/${booking3._id.toString()}/${orderId}`)
      expect(res.statusCode).toBe(400)

      // driver missing
      await booking3.deleteOne()
      booking3 = new Booking({
        supplier: supplierId,
        car: carMissingMembers._id.toString(),
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

      mockGetOrder.mockImplementation(() => Promise.resolve(mockPayPalOrder(
        {},
        { invoice_id: booking3!._id.toString() }
      )))

      res = await request(app)
        .post(`/api/check-paypal-order/${booking3._id.toString()}/${orderId}`)
      expect(res.statusCode).toBe(400)

      // pickupLocation missing
      await booking3.deleteOne()
      booking3 = new Booking({
        supplier: supplierId,
        car: carMissingMembers._id.toString(),
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

      mockGetOrder.mockImplementation(() => Promise.resolve(mockPayPalOrder(
        {},
        { invoice_id: booking3!._id.toString() }
      )))

      res = await request(app)
        .post(`/api/check-paypal-order/${booking3._id.toString()}/${orderId}`)
      expect(res.statusCode).toBe(400)
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
      await carDeposit.deleteOne()
      await carError.deleteOne()
      await carExpired.deleteOne()
      await carMissingMembers.deleteOne()
      await driver.deleteOne()
      await Notification.deleteMany({ user: driver._id.toString() })
      await NotificationCounter.deleteMany({ user: driver._id.toString() })
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

describe('PayPal payment security & integrity regression tests', () => {
  let supplierId: string
  let driver: env.User
  let car: env.Car
  let locationId: string

  beforeAll(async () => {
    const supplierName = nanoid()
    supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    driver = new User({
      fullName: 'regression driver',
      email: testHelper.GetRandomEmail(),
      language: testHelper.LANGUAGE,
      type: bookcarsTypes.UserType.User,
    })
    await driver.save()

    locationId = await testHelper.createLocation('location reg en', 'location reg fr', testHelper.GetRandromObjectIdAsString())

    car = new Car({
      name: 'BMW Regression',
      supplier: supplierId,
      minimumAge: 21,
      locations: [testHelper.GetRandromObjectId()],
      dailyPrice: 100,
      deposit: 500,
      available: true,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: 1000,
      cancellation: 0,
      amendments: 0,
      theftProtection: 0,
      collisionDamageWaiver: 0,
      fullInsurance: 0,
      additionalDriver: 0,
      range: bookcarsTypes.CarRange.Midi,
      rating: 5,
    })
    await car.save()
  })

  afterAll(async () => {
    await car.deleteOne()
    await driver.deleteOne()
    await testHelper.deleteLocation(locationId)
    await testHelper.deleteSupplier(supplierId)
    await testHelper.deleteNotifications(driver._id.toString())
    await NotificationCounter.deleteMany({ user: driver._id.toString() })
  })

  // Test 1 — Amount mismatch
  // Given: booking.price = $500, PayPal completed amount = $1
  // Expected: Payment rejected, Booking remains unpaid
  it('Test 1 — Amount mismatch: should reject payment when PayPal completed amount does not match booking price', async () => {
    const expireAt = new Date()
    expireAt.setSeconds(expireAt.getSeconds() + env.BOOKING_EXPIRE_AT)
    const from = new Date()
    from.setDate(from.getDate() + 1)
    const to = new Date(from)
    to.setDate(to.getDate() + 3)

    const bookingMismatch = new Booking({
      supplier: supplierId,
      car: car._id.toString(),
      driver: driver._id.toString(),
      pickupLocation: locationId,
      dropOffLocation: locationId,
      from,
      to,
      status: bookcarsTypes.BookingStatus.Void,
      expireAt,
      price: 500,
    })
    await bookingMismatch.save()

    const orderId = nanoid()

    jest.resetModules()
    await jest.unstable_mockModule('../src/payment/paypal.js', () => ({
      getOrder: jest.fn(() => Promise.resolve({
        status: 'COMPLETED',
        purchase_units: [
          {
            invoice_id: bookingMismatch._id.toString(),
            amount: {
              currency_code: 'USD',
              value: '1.00',
            },
            payments: {
              captures: [
                {
                  id: 'cap-mismatch',
                  amount: {
                    currency_code: 'USD',
                    value: '1.00',
                  },
                },
              ],
            },
          },
        ],
      })),
      getToken: jest.fn(() => Promise.resolve('fake-token')),
      createOrder: jest.fn(),
    }))

    const res = await request(app)
      .post(`/api/check-paypal-order/${bookingMismatch._id.toString()}/${orderId}`)

    expect(res.statusCode).toBe(400)

    const updatedBooking = await Booking.findById(bookingMismatch._id.toString())
    expect(updatedBooking?.status).not.toBe(bookcarsTypes.BookingStatus.Paid)

    if (updatedBooking) {
      await updatedBooking.deleteOne()
    }
  })

  // Test 2 — Correct amount
  // Given: booking.price = $500, PayPal completed amount = $500
  // Expected: Payment accepted, Booking becomes paid
  it('Test 2 — Correct amount: should accept payment when PayPal completed amount matches booking price', async () => {
    const expireAt = new Date()
    expireAt.setSeconds(expireAt.getSeconds() + env.BOOKING_EXPIRE_AT)
    const from = new Date()
    from.setDate(from.getDate() + 1)
    const to = new Date(from)
    to.setDate(to.getDate() + 3)

    const bookingCorrect = new Booking({
      supplier: supplierId,
      car: car._id.toString(),
      driver: driver._id.toString(),
      pickupLocation: locationId,
      dropOffLocation: locationId,
      from,
      to,
      status: bookcarsTypes.BookingStatus.Void,
      expireAt,
      price: 500,
    })
    await bookingCorrect.save()

    const orderId = nanoid()

    jest.resetModules()
    await jest.unstable_mockModule('../src/payment/paypal.js', () => ({
      getOrder: jest.fn(() => Promise.resolve({
        status: 'COMPLETED',
        purchase_units: [
          {
            invoice_id: bookingCorrect._id.toString(),
            amount: {
              currency_code: 'USD',
              value: '500.00',
            },
            payments: {
              captures: [
                {
                  id: 'cap-correct',
                  amount: {
                    currency_code: 'USD',
                    value: '500.00',
                  },
                },
              ],
            },
          },
        ],
      })),
      getToken: jest.fn(() => Promise.resolve('fake-token')),
      createOrder: jest.fn(),
    }))

    const res = await request(app)
      .post(`/api/check-paypal-order/${bookingCorrect._id.toString()}/${orderId}`)

    expect(res.statusCode).toBe(200)

    const updatedBooking = await Booking.findById(bookingCorrect._id.toString())
    expect(updatedBooking).toBeTruthy()
    expect(updatedBooking?.status).toBe(bookcarsTypes.BookingStatus.Paid)
    expect(updatedBooking?.paypalOrderId).toBe(orderId)
    expect(updatedBooking?.expireAt).toBeUndefined()

    await testHelper.deleteNotifications(bookingCorrect._id.toString())
    await updatedBooking?.deleteOne()
  })

  // Test 3 — Booking/order mismatch
  // A completed PayPal order associated with booking A should not be accepted to mark booking B as paid.
  it('Test 3 — Booking/order mismatch: should reject marking booking B as paid using order of booking A', async () => {
    const expireAt = new Date()
    expireAt.setSeconds(expireAt.getSeconds() + env.BOOKING_EXPIRE_AT)
    const from = new Date()
    from.setDate(from.getDate() + 1)
    const to = new Date(from)
    to.setDate(to.getDate() + 3)

    const bookingA = new Booking({
      supplier: supplierId,
      car: car._id.toString(),
      driver: driver._id.toString(),
      pickupLocation: locationId,
      dropOffLocation: locationId,
      from,
      to,
      status: bookcarsTypes.BookingStatus.Void,
      expireAt,
      price: 500,
    })
    await bookingA.save()

    const bookingB = new Booking({
      supplier: supplierId,
      car: car._id.toString(),
      driver: driver._id.toString(),
      pickupLocation: locationId,
      dropOffLocation: locationId,
      from,
      to,
      status: bookcarsTypes.BookingStatus.Void,
      expireAt,
      price: 500,
    })
    await bookingB.save()

    const orderIdA = nanoid()

    jest.resetModules()
    await jest.unstable_mockModule('../src/payment/paypal.js', () => ({
      getOrder: jest.fn(() => Promise.resolve({
        status: 'COMPLETED',
        purchase_units: [
          {
            invoice_id: bookingA._id.toString(),
            amount: {
              currency_code: 'USD',
              value: '500.00',
            },
            payments: {
              captures: [
                {
                  id: 'cap-a',
                  amount: {
                    currency_code: 'USD',
                    value: '500.00',
                  },
                },
              ],
            },
          },
        ],
      })),
      getToken: jest.fn(() => Promise.resolve('fake-token')),
      createOrder: jest.fn(),
    }))

    // Attempt to use order of booking A to mark booking B as paid
    const res = await request(app)
      .post(`/api/check-paypal-order/${bookingB._id.toString()}/${orderIdA}`)

    expect(res.statusCode).toBe(400)

    const updatedBookingB = await Booking.findById(bookingB._id.toString())
    expect(updatedBookingB?.status).not.toBe(bookcarsTypes.BookingStatus.Paid)

    await bookingA.deleteOne()
    if (updatedBookingB) {
      await updatedBookingB.deleteOne()
    }
  })
})
