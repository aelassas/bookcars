import 'dotenv/config'
import request from 'supertest'
import url from 'url'
import path from 'path'
import asyncFs from 'node:fs/promises'
import { nanoid } from 'nanoid'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import app from '../src/app'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import * as helper from '../src/utils/helper'
import * as env from '../src/config/env.config'
import Car from '../src/models/Car'
import Booking from '../src/models/Booking'
import AdditionalDriver from '../src/models/AdditionalDriver'
import User from '../src/models/User'
import PushToken from '../src/models/PushToken'
import Token from '../src/models/Token'
import Notification from '../src/models/Notification'
import NotificationCounter from '../src/models/NotificationCounter'
import Location from '../src/models/Location'
import LocationValue from '../src/models/LocationValue'
import stripeAPI from '../src/payment/stripe'
import { BookingConflictError, saveBookingsWithAvailability } from '../src/utils/bookingReservationHelper'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONTRACT1 = 'contract1.pdf'
const CONTRACT1_PATH = path.join(__dirname, `./contracts/${CONTRACT1}`)

const LICENSE = 'contract1.pdf'
const LICENSE_PATH = path.join(__dirname, `./contracts/${LICENSE}`)

const DRIVER1_NAME = 'driver1'

let SUPPLIER_ID: string
let DRIVER1_ID: string
let DRIVER2_ID: string
let LOCATION_ID: string
let CAR1_ID: string
let CAR2_ID: string
let BOOKING_ID: string
let ADDITIONAL_DRIVER_ID: string

const ADDITIONAL_DRIVER_EMAIL: string = testHelper.GetRandomEmail()
const ADDITIONAL_DRIVER: bookcarsTypes.AdditionalDriver = {
  email: ADDITIONAL_DRIVER_EMAIL,
  fullName: 'Additional Driver 1',
  birthDate: new Date(2024, 5, 20),
  phone: '0102010101',
}

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  await databaseHelper.connect(env.DB_URI, false, false)

  await testHelper.initialize()

  // create a supplier
  const supplierName = testHelper.getSupplierName()
  SUPPLIER_ID = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)

  const contractFileName = `${SUPPLIER_ID}_en.pdf`
  const contractFile = path.join(env.CDN_CONTRACTS, contractFileName)
  if (!(await helper.pathExists(contractFile))) {
    await asyncFs.copyFile(CONTRACT1_PATH, contractFile)
  }
  const supplier = await User.findById(SUPPLIER_ID)
  supplier!.contracts = [{ language: 'en', file: contractFileName }]
  await supplier?.save()

  // create driver 1
  const driver1 = new User({
    fullName: DRIVER1_NAME,
    email: testHelper.GetRandomEmail(),
    language: testHelper.LANGUAGE,
    type: bookcarsTypes.UserType.User,
  })
  await driver1.save()
  DRIVER1_ID = driver1._id.toString()

  // create a location
  LOCATION_ID = await testHelper.createLocation('Location 1 EN', 'Location 1 FR')

  // create car
  const payload: bookcarsTypes.CreateCarPayload = {
    loggedUser: testHelper.GetRandromObjectIdAsString(),
    name: 'BMW X1',
    supplier: SUPPLIER_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 78,
    discountedDailyPrice: null,
    hourlyPrice: null,
    discountedHourlyPrice: null,
    biWeeklyPrice: null,
    discountedBiWeeklyPrice: null,
    weeklyPrice: null,
    discountedWeeklyPrice: null,
    monthlyPrice: null,
    discountedMonthlyPrice: null,
    deposit: 950,
    available: false,
    type: bookcarsTypes.CarType.Diesel,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
    mileage: -1,
    cancellation: 0,
    amendments: 0,
    theftProtection: 9,
    collisionDamageWaiver: 12,
    fullInsurance: 20,
    additionalDriver: 0,
    range: bookcarsTypes.CarRange.Midi,
    multimedia: [bookcarsTypes.CarMultimedia.AndroidAuto],
    rating: 4,
    isDateBasedPrice: false,
    dateBasedPrices: [],
  }

  // car 1
  let car = new Car(payload)
  await car.save()
  CAR1_ID = car._id.toString()

  // car 2
  car = new Car({ ...payload, name: 'BMW X5', dailyPrice: 88 })
  await car.save()
  CAR2_ID = car._id.toString()
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  await testHelper.close()

  // delete the supplier
  await testHelper.deleteSupplier(SUPPLIER_ID)

  // delete the location
  await testHelper.deleteLocation(LOCATION_ID)

  // delete the car
  await Car.deleteMany({ _id: { $in: [CAR1_ID, CAR2_ID] } })

  // delete drivers
  // await User.deleteMany({ _id: { $in: [DRIVER1_ID, DRIVER2_ID] } })
  const drivers = await User.find({ _id: { $in: [DRIVER1_ID, DRIVER2_ID] } })
  for (const driver of drivers) {
    if (driver.license) {
      const license = path.join(env.CDN_LICENSES, driver.license)
      if (await helper.pathExists(license)) {
        await asyncFs.unlink(license)
      }
    }
    await driver.deleteOne()
  }
  await Notification.deleteMany({ user: { $in: [DRIVER1_ID, DRIVER2_ID] } })
  await NotificationCounter.deleteMany({ user: { $in: [DRIVER1_ID, DRIVER2_ID] } })

  await databaseHelper.close()
})

//
// Unit tests
//

describe('POST /api/create-booking', () => {
  it('should create a booking', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (with additional driver)
    const payload: bookcarsTypes.UpsertBookingPayload = {
      booking: {
        supplier: SUPPLIER_ID,
        car: CAR1_ID,
        driver: DRIVER1_ID,
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: new Date(2024, 2, 1),
        to: new Date(2024, 2, 4),
        status: bookcarsTypes.BookingStatus.Pending,
        cancellation: true,
        amendments: true,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: 312,
        additionalDriver: true,
      },
      additionalDriver: ADDITIONAL_DRIVER,
    }
    let res = await request(app)
      .post('/api/create-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    BOOKING_ID = res.body._id
    const additionalDriver = await AdditionalDriver.findOne({ email: ADDITIONAL_DRIVER_EMAIL })
    expect(additionalDriver).not.toBeNull()
    ADDITIONAL_DRIVER_ID = additionalDriver?._id.toString() || ''

    // test success (without additional driver)
    payload.booking!.additionalDriver = false
    res = await request(app)
      .post('/api/create-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    payload.booking!.additionalDriver = true

    // test failure (no payload)
    res = await request(app)
      .post('/api/create-booking')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('booking reservation concurrency', () => {
  const makeBooking = (
    car: string,
    from: Date,
    to: Date,
    status: bookcarsTypes.BookingStatus = bookcarsTypes.BookingStatus.Reserved,
  ) => new Booking({
    supplier: SUPPLIER_ID,
    car,
    driver: DRIVER1_ID,
    pickupLocation: LOCATION_ID,
    dropOffLocation: LOCATION_ID,
    from,
    to,
    status,
    price: 100,
  })

  it('allows only one concurrent overlapping reservation for a blocking car', async () => {
    const start = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    const first = makeBooking(CAR1_ID, start, new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000))
    const second = makeBooking(
      CAR1_ID,
      new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000),
      new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000),
    )

    try {
      const results = await Promise.allSettled([
        saveBookingsWithAvailability([first]),
        saveBookingsWithAvailability([second]),
      ])

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
      const rejected = results.find((result) => result.status === 'rejected')
      expect(rejected).toBeDefined()
      expect((rejected as PromiseRejectedResult).reason).toBeInstanceOf(BookingConflictError)
      expect(await Booking.countDocuments({ _id: { $in: [first._id, second._id] } })).toBe(1)
    } finally {
      await Booking.deleteMany({ _id: { $in: [first._id, second._id] } })
    }
  })

  it('holds a car for an unexpired payment checkout', async () => {
    const start = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
    const hold = makeBooking(CAR1_ID, start, new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000), bookcarsTypes.BookingStatus.Void)
    hold.expireAt = new Date(Date.now() + 30 * 60 * 1000)
    const competingBooking = makeBooking(CAR1_ID, start, new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000))

    try {
      await saveBookingsWithAvailability([hold])
      await expect(saveBookingsWithAvailability([competingBooking])).rejects.toBeInstanceOf(BookingConflictError)
    } finally {
      await Booking.deleteMany({ _id: { $in: [hold._id, competingBooking._id] } })
    }
  })

  it('allows non-overlapping dates and preserves blockOnPay false behavior', async () => {
    const car = await Car.findById(CAR2_ID)
    const previousBlockOnPay = car!.blockOnPay

    const start = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    const first = makeBooking(CAR2_ID, start, new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000))
    const second = makeBooking(
      CAR2_ID,
      new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000),
      new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000),
    )
    const third = makeBooking(
      CAR2_ID,
      new Date(start.getTime() + 1 * 24 * 60 * 60 * 1000),
      new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000),
    )

    try {
      await expect(saveBookingsWithAvailability([first, second])).resolves.toBe(true)
      await expect(saveBookingsWithAvailability([third])).rejects.toBeInstanceOf(BookingConflictError)
      car!.blockOnPay = false
      await car!.save()
      await expect(saveBookingsWithAvailability([third])).resolves.toBe(true)
      expect(await Booking.countDocuments({ _id: { $in: [first._id, second._id, third._id] } })).toBe(3)
    } finally {
      await Booking.deleteMany({ _id: { $in: [first._id, second._id, third._id] } })
      car!.blockOnPay = previousBlockOnPay
      await car!.save()
    }
  })
})

describe('POST /api/checkout', () => {
  it('confirms checkout when pickup and drop-off translations are missing', async () => {
    const pickupValue = new LocationValue({ language: 'es', value: 'Recogida' })
    const dropOffValue = new LocationValue({ language: 'en', value: 'Drop-off' })
    await pickupValue.save()
    await dropOffValue.save()

    const pickupLocation = new Location({ country: testHelper.GetRandromObjectId(), values: [pickupValue._id] })
    const dropOffLocation = new Location({ country: testHelper.GetRandromObjectId(), values: [dropOffValue._id] })
    await pickupLocation.save()
    await dropOffLocation.save()

    const driver = await User.findById(DRIVER1_ID)
    const previousLanguage = driver!.language
    driver!.language = 'fr'
    await driver!.save()

    const payload: bookcarsTypes.CheckoutPayload = {
      booking: {
        supplier: SUPPLIER_ID,
        car: CAR2_ID,
        driver: DRIVER1_ID,
        pickupLocation: pickupLocation._id.toString(),
        dropOffLocation: dropOffLocation._id.toString(),
        from: new Date(2035, 3, 1),
        to: new Date(2035, 3, 4),
        status: bookcarsTypes.BookingStatus.Pending,
        price: 312,
      },
      payLater: true,
    }

    try {
      const res = await request(app)
        .post('/api/checkout')
        .send(payload)

      expect(res.statusCode).toBe(200)
      expect(res.body.bookingId).toBeTruthy()
      await Booking.deleteOne({ _id: res.body.bookingId })
    } finally {
      driver!.language = previousLanguage
      await driver!.save()
      await Location.deleteMany({ _id: { $in: [pickupLocation._id, dropOffLocation._id] } })
      await LocationValue.deleteMany({ _id: { $in: [pickupValue._id, dropOffValue._id] } })
    }
  })

  it('should checkout', async () => {
    let bookings = await Booking.find({ driver: DRIVER1_ID })
    expect(bookings.length).toBe(2)

    // test success
    const payload: bookcarsTypes.CheckoutPayload = {
      booking: {
        supplier: SUPPLIER_ID,
        car: CAR1_ID,
        driver: DRIVER1_ID,
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: new Date(2024, 3, 1),
        to: new Date(2024, 3, 4),
        status: bookcarsTypes.BookingStatus.Pending,
        cancellation: true,
        amendments: true,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: 312,
        additionalDriver: true,
      },
      payLater: true,
    }
    let res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    bookings = await Booking.find({ driver: DRIVER1_ID })
    expect(bookings.length).toBeGreaterThan(1)
    expect(res.body.bookingId).toBeTruthy()

    // test success (driver.enableEmailNotifications disabled)
    let driver = await User.findById(DRIVER1_ID)
    driver!.enableEmailNotifications = false
    await driver!.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    driver!.enableEmailNotifications = true
    await driver!.save()
    expect(res.body.bookingId).toBeTruthy()

    // test success (supplier.enableEmailNotifications disabled)
    let supplier = await User.findById(SUPPLIER_ID)
    supplier!.enableEmailNotifications = false
    await supplier!.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    supplier!.enableEmailNotifications = true
    await supplier!.save()

    // test success (without contract)
    supplier = await User.findById(SUPPLIER_ID)
    let { contracts } = (supplier!)
    supplier!.contracts = undefined
    await supplier!.save()
    await driver!.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    supplier!.contracts = contracts
    await supplier!.save()
    expect(res.body.bookingId).toBeTruthy()

    // test success (with contract file not found)
    supplier = await User.findById(SUPPLIER_ID)
    contracts = supplier!.contracts
    supplier!.contracts = [{ language: 'en', file: `${nanoid()}.pdf` }]
    await supplier!.save()
    await driver!.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    supplier!.contracts = contracts
    await supplier!.save()
    expect(res.body.bookingId).toBeTruthy()

    // test success (with contract file null)
    supplier = await User.findById(SUPPLIER_ID)
    contracts = supplier!.contracts
    supplier!.contracts = [{ language: 'en', file: null }]
    await supplier!.save()
    await driver!.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    supplier!.contracts = contracts
    await supplier!.save()
    expect(res.body.bookingId).toBeTruthy()

    // test success (with contract fr language)
    driver = await User.findById(DRIVER1_ID)
    driver!.language = 'fr'
    await driver!.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    driver!.language = 'en'
    await driver!.save()
    expect(res.body.bookingId).toBeTruthy()

    // test failure (stripe payment failed)
    payload.payLater = false
    const receiptEmail = testHelper.GetRandomEmail()
    const paymentIntentPayload: bookcarsTypes.CreatePaymentPayload = {
      amount: 234,
      currency: 'usd',
      receiptEmail,
      customerName: 'John Doe',
      description: 'BookCars Testing Service',
      locale: 'en',
      name: 'Test',
    }
    res = await request(app)
      .post('/api/create-payment-intent')
      .send(paymentIntentPayload)
    expect(res.statusCode).toBe(200)
    expect(res.body.paymentIntentId).not.toBeNull()
    expect(res.body.customerId).not.toBeNull()
    const { paymentIntentId, customerId } = res.body
    payload.paymentIntentId = paymentIntentId
    payload.customerId = customerId
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)
    // Regression check: verify that no booking document was saved when payment fails
    const failedBooking = await Booking.findOne({ paymentIntentId })
    expect(failedBooking).toBeNull()

    // test success (stripe payment succeeded)
    await stripeAPI.paymentIntents.confirm(paymentIntentId, {
      payment_method: 'pm_card_visa',
    })
    driver = await User.findOne({ _id: DRIVER1_ID })
    driver!.language = 'fr'
    await driver?.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    try {
      expect(res.statusCode).toBe(200)
      bookings = await Booking.find({ driver: DRIVER1_ID })
      expect(bookings.length).toBeGreaterThan(2)
      expect(res.body.bookingId).toBeTruthy()

      // test failure (car not found)
      const carId = payload.booking!.car
      const oldPaymentIntentId = payload.paymentIntentId
      payload.paymentIntentId = undefined // Clear existing paymentIntentId so idempotency check is bypassed
      payload.booking!.car = testHelper.GetRandromObjectIdAsString()
      res = await request(app)
        .post('/api/checkout')
        .send(payload)
      expect(res.statusCode).toBe(400)
      payload.booking!.car = carId
      payload.paymentIntentId = oldPaymentIntentId
    } catch (err) {
      console.error(err)
    } finally {
      const customer = await stripeAPI.customers.retrieve(customerId)
      if (customer) {
        await stripeAPI.customers.del(customerId)
      }
    }
    driver!.language = 'en'
    await driver?.save()

    // test failure (paymentIntendId and sessionId not found)
    payload.paymentIntentId = undefined
    payload.sessionId = undefined
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test success (checkout session)
    // Clean up previous test bookings for CAR1_ID so date availability checks pass
    await Booking.deleteMany({ car: CAR1_ID, _id: { $ne: BOOKING_ID } })
    payload.paymentIntentId = undefined
    payload.sessionId = 'xxxxxxxxxxxxxx'
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    const { bookingId } = res.body
    expect(bookingId).toBeTruthy()
    let booking = await Booking.findById(bookingId)
    expect(booking?.status).toBe(bookcarsTypes.BookingStatus.Void)
    expect(booking?.sessionId).toBe(payload.sessionId)

    // test success (checkout session driver not verified)
    // Clean up previous test bookings for CAR1_ID so date availability checks pass
    await Booking.deleteMany({ car: CAR1_ID, _id: { $ne: BOOKING_ID } })
    driver = await User.findById(DRIVER1_ID)
    driver!.verified = false
    await driver!.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.bookingId).toBeTruthy()
    // Clean up the temporary void booking created in this step to free up the dates
    await Booking.deleteOne({ _id: res.body.bookingId })
    driver!.verified = true
    await driver!.save()

    // test success (checkout session with no additional driver)
    payload.booking!.additionalDriver = false
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.bookingId).toBeTruthy()
    bookings = await Booking.find({ driver: DRIVER1_ID })
    expect(bookings.length).toBeGreaterThanOrEqual(2)
    await Booking.deleteOne({ _id: res.body.bookingId })

    payload.booking!.additionalDriver = true

    // test failure (supplier not found)
    const supplierId = payload.booking!.supplier
    payload.booking!.supplier = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)
    payload.booking!.supplier = supplierId

    // test failure (user not found)
    payload.booking!.driver = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)
    payload.booking!.driver = undefined

    // test success (payLater with new driver with no license)
    payload.payLater = true
    payload.driver = {
      fullName: 'driver2',
      email: testHelper.GetRandomEmail(),
      language: testHelper.LANGUAGE,
    }
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    const driver2 = await User.findOne({ email: payload.driver.email })
    expect(driver2).toBeTruthy()
    DRIVER2_ID = driver2!._id.toString()
    let token = await Token.findOne({ user: DRIVER2_ID })
    expect(token).not.toBeNull()
    expect(token?.token.length).toBeGreaterThan(0)
    await token?.deleteOne()
    expect(res.body.bookingId).toBeTruthy()
    await Booking.deleteOne({ _id: res.body.bookingId })

    // test success (payLater with existing registered driver email)
    payload.payLater = true
    payload.driver = {
      fullName: 'driver1',
      email: driver!.email,
      language: testHelper.LANGUAGE,
    }
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.bookingId).toBeTruthy()
    await Booking.deleteOne({ _id: res.body.bookingId })

    // test failure (license required)
    supplier = await User.findById(payload.booking!.supplier)
    supplier!.licenseRequired = true
    await supplier?.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (license file not found)
    payload.driver.license = LICENSE
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test success (license)
    payload.driver.email = testHelper.GetRandomEmail()
    let license = path.join(env.CDN_TEMP_LICENSES, LICENSE)
    if (!(await helper.pathExists(license))) {
      await asyncFs.copyFile(LICENSE_PATH, license)
    }
    payload.driver.license = LICENSE
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    const driver3 = await User.findOne({ email: payload.driver.email })
    expect(driver3).toBeTruthy()
    token = await Token.findOne({ user: driver3!._id })
    expect(token).not.toBeNull()
    expect(token?.token.length).toBeGreaterThan(0)
    expect(res.body.bookingId).toBeTruthy()
    booking = await Booking.findById(res.body.bookingId)
    expect(booking).toBeTruthy()
    await testHelper.deleteNotifications(booking!._id.toString())
    expect(driver3?.license).toBeTruthy()
    license = path.join(env.CDN_LICENSES, driver3!.license!)
    expect(await helper.pathExists(license)).toBeTruthy()
    await asyncFs.unlink(license)
    await booking?.deleteOne()
    await token?.deleteOne()
    await driver3!.deleteOne()
    supplier!.licenseRequired = false
    await supplier?.save()

    // test success (payLater without new driver)
    payload.driver = undefined
    payload.booking!.driver = DRIVER1_ID
    payload.additionalDriver = {
      email: testHelper.GetRandomEmail(),
      fullName: 'Addtional Driver',
      birthDate: new Date(1980, 2, 25),
      phone: '01010101',
    }
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)
    const additionalDrivers = await AdditionalDriver.find({ email: payload.additionalDriver.email })
    expect(additionalDrivers.length).toBe(1)
    expect(res.body.bookingId).toBeTruthy()
    await Booking.deleteOne({ _id: res.body.bookingId })

    // test failure (car not found)
    payload.additionalDriver = undefined
    payload.booking!.car = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)
    payload.booking!.car = CAR1_ID

    // test failure (license required)
    supplier!.licenseRequired = true
    await supplier?.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (license file not found)
    driver = await User.findById(DRIVER1_ID)
    driver!.license = `${nanoid()}.pdf`
    await driver!.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test success (license file found)
    license = path.join(env.CDN_LICENSES, LICENSE)
    if (!(await helper.pathExists(license))) {
      await asyncFs.copyFile(LICENSE_PATH, license)
    }
    driver!.license = LICENSE
    await driver!.save()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(200)

    supplier!.licenseRequired = true
    await supplier?.save()

    // test failure (wrong pickupLocation)
    payload.booking!.car = CAR1_ID
    payload.booking!.pickupLocation = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (wrong dropOffLocation)
    payload.booking!.pickupLocation = LOCATION_ID
    payload.booking!.dropOffLocation = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (wrong supplier)
    payload.booking!.dropOffLocation = LOCATION_ID
    payload.booking!.supplier = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (wrong driver)
    payload.booking!.supplier = SUPPLIER_ID
    payload.booking!.driver = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (no booking)
    payload.booking = undefined
    res = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (no payload)
    res = await request(app)
      .post('/api/checkout')
      .send({ booking: { driver: DRIVER1_ID } })
    expect(res.statusCode).toBe(400)

    // cleanup notifications
    bookings = await Booking.find({ driver: { $in: [DRIVER1_ID, DRIVER2_ID] } })
    for (const booking of bookings) {
      await testHelper.deleteNotifications(booking._id.toString())
    }
  })
})

describe('Security Regression Tests - Issue #28 Checkout Payment Binding', () => {
  it('should ignore client-supplied Paid status when payLater is enabled', async () => {
    const payload: bookcarsTypes.CheckoutPayload = {
      booking: {
        supplier: SUPPLIER_ID,
        car: CAR1_ID,
        driver: DRIVER1_ID,
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: new Date(2025, 5, 1),
        to: new Date(2025, 5, 4),
        status: bookcarsTypes.BookingStatus.Paid, // Client attempting to tamper with status
        cancellation: false,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: 3000,
        additionalDriver: false,
      },
      payLater: true,
    }

    const res = await request(app)
      .post('/api/checkout')
      .send(payload)

    expect(res.statusCode).toBe(200)
    const booking = await Booking.findById(res.body.bookingId)
    expect(booking).not.toBeNull()
    // Server must force status to Pending, ignoring client's requested "Paid"
    expect(booking?.status).toBe(bookcarsTypes.BookingStatus.Pending)
    await Booking.deleteOne({ _id: res.body.bookingId })
  })

  it('should reject payment checkout if amount does not match expected car price', async () => {
    // Create Payment Intent for $10.00 USD (1000 cents)
    const receiptEmail = testHelper.GetRandomEmail()
    const paymentIntentPayload: bookcarsTypes.CreatePaymentPayload = {
      amount: 10,
      currency: 'usd',
      receiptEmail,
      customerName: 'Underpaid Attacker',
      description: 'Underpaid Test Intent',
      locale: 'en',
      name: 'Test Underpay',
    }
    const piRes = await request(app)
      .post('/api/create-payment-intent')
      .send(paymentIntentPayload)
    expect(piRes.statusCode).toBe(200)
    const { paymentIntentId, customerId } = piRes.body

    await stripeAPI.paymentIntents.confirm(paymentIntentId, {
      payment_method: 'pm_card_visa',
    })

    const payload: bookcarsTypes.CheckoutPayload = {
      booking: {
        supplier: SUPPLIER_ID,
        car: CAR1_ID,
        driver: DRIVER1_ID,
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: new Date(2025, 6, 1),
        to: new Date(2025, 6, 4),
        status: bookcarsTypes.BookingStatus.Pending,
        cancellation: false,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: 3000,
        additionalDriver: false,
      },
      payLater: false,
      paymentIntentId,
      customerId,
    }

    const res = await request(app)
      .post('/api/checkout')
      .send(payload)

    expect(res.statusCode).toBe(400)
    expect(res.text).toContain('Payment amount mismatch')

    const customer = await stripeAPI.customers.retrieve(customerId)
    if (customer) {
      await stripeAPI.customers.del(customerId)
    }
  })

  it('should reject payment checkout if paymentIntentId is replayed', async () => {
    const car = await Car.findById(CAR1_ID)
    const expectedBasePrice = bookcarsHelper.calculateTotalPrice(
      car!.toObject() as unknown as bookcarsTypes.Car,
      new Date(2025, 7, 1),
      new Date(2025, 7, 4),
      0,
      {
        cancellation: false,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        additionalDriver: false,
      }
    )

    const receiptEmail = testHelper.GetRandomEmail()
    const paymentIntentPayload: bookcarsTypes.CreatePaymentPayload = {
      amount: expectedBasePrice,
      currency: 'usd',
      receiptEmail,
      customerName: 'Replay Tester',
      description: 'Valid Intent',
      locale: 'en',
      name: 'Test Replay',
    }
    const piRes = await request(app)
      .post('/api/create-payment-intent')
      .send(paymentIntentPayload)
    const { paymentIntentId, customerId } = piRes.body

    await stripeAPI.paymentIntents.confirm(paymentIntentId, {
      payment_method: 'pm_card_visa',
    })

    const payload: bookcarsTypes.CheckoutPayload = {
      booking: {
        supplier: SUPPLIER_ID,
        car: CAR1_ID,
        driver: DRIVER1_ID,
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: new Date(2025, 7, 1),
        to: new Date(2025, 7, 4),
        status: bookcarsTypes.BookingStatus.Pending,
        cancellation: false,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: expectedBasePrice,
        additionalDriver: false,
      },
      payLater: false,
      paymentIntentId,
      customerId,
    }

    // First checkout succeeds
    const firstRes = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(firstRes.statusCode).toBe(200)

    // Replay attack attempt with same paymentIntentId fails
    const secondRes = await request(app)
      .post('/api/checkout')
      .send(payload)
    expect(secondRes.statusCode).toBe(200)
    expect(secondRes.body.bookingId).toBe(firstRes.body.bookingId)

    await Booking.deleteOne({ _id: firstRes.body.bookingId })
    const customer = await stripeAPI.customers.retrieve(customerId)
    if (customer) {
      await stripeAPI.customers.del(customerId)
    }
  })
})

// ---------------------------------------------------------------------------
// TOCTOU / Double-Booking Regression Tests
// Validates that checkout revalidates availability before persisting a booking.
// ---------------------------------------------------------------------------
describe('Security Regression Tests - TOCTOU Availability Revalidation', () => {
  let toctouCarId: string
  let toctouDriverId: string
  let toctouCarObj: bookcarsTypes.Car
  let supplierPriceChangeRate: number

  beforeAll(async () => {
    // Reset licenseRequired on SUPPLIER_ID in case previous tests left it true
    const supplier = await User.findById(SUPPLIER_ID)
    if (supplier) {
      supplier.licenseRequired = false
      await supplier.save()
      supplierPriceChangeRate = supplier.priceChangeRate || 0
    } else {
      supplierPriceChangeRate = 0
    }

    // Create a dedicated car with blockOnPay enabled for availability checks
    const car = new Car({
      name: 'TOCTOU Test Car',
      supplier: SUPPLIER_ID,
      minimumAge: 21,
      locations: [LOCATION_ID],
      dailyPrice: 100,
      deposit: 500,
      available: true,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 0,
      collisionDamageWaiver: 0,
      fullInsurance: 0,
      additionalDriver: 0,
      range: bookcarsTypes.CarRange.Midi,
      multimedia: [],
      rating: 5,
      isDateBasedPrice: false,
      dateBasedPrices: [],
      blockOnPay: true,
    })
    await car.save()
    toctouCarId = car._id.toString()
    toctouCarObj = car.toObject() as unknown as bookcarsTypes.Car

    const driver = new User({
      fullName: 'TOCTOU Driver',
      email: testHelper.GetRandomEmail(),
      language: testHelper.LANGUAGE,
      type: bookcarsTypes.UserType.User,
    })
    await driver.save()
    toctouDriverId = driver._id.toString()
  })

  afterAll(async () => {
    await Car.deleteOne({ _id: toctouCarId })
    await User.deleteOne({ _id: toctouDriverId })
    await Booking.deleteMany({ car: toctouCarId })
    await Notification.deleteMany({ user: toctouDriverId })
    await NotificationCounter.deleteMany({ user: toctouDriverId })
  })

  it('should return 409 when the car has a conflicting booking (stale-availability scenario)', async () => {
    const conflictFrom = new Date(2026, 9, 28)
    const conflictTo = new Date(2026, 9, 31)

    const expectedPrice = bookcarsHelper.calculateTotalPrice(
      toctouCarObj,
      conflictFrom,
      conflictTo,
      supplierPriceChangeRate,
      {
        cancellation: false,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        additionalDriver: false,
      }
    )

    const existingBooking = new Booking({
      supplier: SUPPLIER_ID,
      car: toctouCarId,
      driver: DRIVER1_ID,
      pickupLocation: LOCATION_ID,
      dropOffLocation: LOCATION_ID,
      from: conflictFrom,
      to: conflictTo,
      status: bookcarsTypes.BookingStatus.Paid,
      cancellation: false,
      amendments: false,
      theftProtection: false,
      collisionDamageWaiver: false,
      fullInsurance: false,
      price: expectedPrice,
      additionalDriver: false,
    })
    await existingBooking.save()

    const payload: bookcarsTypes.CheckoutPayload = {
      booking: {
        supplier: SUPPLIER_ID,
        car: toctouCarId,
        driver: toctouDriverId,
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: conflictFrom,
        to: conflictTo,
        status: bookcarsTypes.BookingStatus.Pending,
        cancellation: false,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: expectedPrice,
        additionalDriver: false,
      },
      payLater: true,
    }

    const res = await request(app).post('/api/checkout').send(payload)
    expect(res.statusCode).toBe(409)

    // Verify duplicate booking was blocked
    const count = await Booking.countDocuments({
      car: toctouCarId,
      from: conflictFrom,
      to: conflictTo,
    })
    expect(count).toBe(1)

    await Booking.deleteOne({ _id: existingBooking._id })
  })

  it('should block a checkout when a concurrent booking achieves Reserved status before saving (race condition)', async () => {
    const raceFrom = new Date(2026, 10, 1)
    const raceTo = new Date(2026, 10, 5)

    const expectedPrice = bookcarsHelper.calculateTotalPrice(
      toctouCarObj,
      raceFrom,
      raceTo,
      supplierPriceChangeRate,
      {
        cancellation: false,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        additionalDriver: false,
      }
    )

    const reservedBooking = new Booking({
      supplier: SUPPLIER_ID,
      car: toctouCarId,
      driver: DRIVER1_ID,
      pickupLocation: LOCATION_ID,
      dropOffLocation: LOCATION_ID,
      from: raceFrom,
      to: raceTo,
      status: bookcarsTypes.BookingStatus.Reserved,
      cancellation: false,
      amendments: false,
      theftProtection: false,
      collisionDamageWaiver: false,
      fullInsurance: false,
      price: expectedPrice,
      additionalDriver: false,
    })
    await reservedBooking.save()

    const payloadB: bookcarsTypes.CheckoutPayload = {
      booking: {
        supplier: SUPPLIER_ID,
        car: toctouCarId,
        driver: toctouDriverId,
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: raceFrom,
        to: raceTo,
        status: bookcarsTypes.BookingStatus.Pending,
        cancellation: false,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: expectedPrice,
        additionalDriver: false,
      },
      payLater: true,
    }

    const res = await request(app).post('/api/checkout').send(payloadB)
    expect(res.statusCode).toBe(409)

    const count = await Booking.countDocuments({ car: toctouCarId, from: raceFrom, to: raceTo })
    expect(count).toBe(1)

    await Booking.deleteOne({ _id: reservedBooking._id })
  })

  it('should NOT block concurrent checkouts when blockOnPay is false', async () => {
    const nonBlockCar = new Car({
      name: 'Non-Block Car',
      supplier: SUPPLIER_ID,
      minimumAge: 21,
      locations: [LOCATION_ID],
      dailyPrice: 100,
      deposit: 500,
      available: true,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 0,
      collisionDamageWaiver: 0,
      fullInsurance: 0,
      additionalDriver: 0,
      range: bookcarsTypes.CarRange.Midi,
      multimedia: [],
      rating: 5,
      isDateBasedPrice: false,
      dateBasedPrices: [],
      blockOnPay: false,
    })
    await nonBlockCar.save()
    const nbCarId = nonBlockCar._id.toString()
    const nbCarObj = nonBlockCar.toObject() as unknown as bookcarsTypes.Car

    const nbFrom = new Date(2026, 11, 1)
    const nbTo = new Date(2026, 11, 4)

    const expectedPrice = bookcarsHelper.calculateTotalPrice(
      nbCarObj,
      nbFrom,
      nbTo,
      supplierPriceChangeRate,
      {
        cancellation: false,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        additionalDriver: false,
      }
    )

    const makePayload = (driverId: string): bookcarsTypes.CheckoutPayload => ({
      booking: {
        supplier: SUPPLIER_ID,
        car: nbCarId,
        driver: driverId,
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: nbFrom,
        to: nbTo,
        status: bookcarsTypes.BookingStatus.Pending,
        cancellation: false,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: expectedPrice,
        additionalDriver: false,
      },
      payLater: true,
    })

    const [res1, res2] = await Promise.all([
      request(app).post('/api/checkout').send(makePayload(DRIVER1_ID)),
      request(app).post('/api/checkout').send(makePayload(toctouDriverId)),
    ])

    expect(res1.statusCode).toBe(200)
    expect(res2.statusCode).toBe(200)

    await Booking.deleteMany({ car: nbCarId })
    await Car.deleteOne({ _id: nbCarId })
  })
})

describe('POST /api/update-booking', () => {
  it('should update a booking', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    ADDITIONAL_DRIVER.fullName = 'Additional Driver 2'
    const payload: bookcarsTypes.UpsertBookingPayload = {
      booking: {
        _id: BOOKING_ID,
        supplier: SUPPLIER_ID,
        car: CAR2_ID,
        driver: DRIVER1_ID,
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: new Date(2024, 2, 1),
        to: new Date(2024, 2, 4),
        status: bookcarsTypes.BookingStatus.Paid,
        cancellation: true,
        amendments: true,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        price: 3520,
        additionalDriver: true,
      },
      additionalDriver: ADDITIONAL_DRIVER,
    }
    let res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.car).toBe(CAR2_ID)
    expect(res.body.price).toBe(3520)
    expect(res.body.status).toBe(bookcarsTypes.BookingStatus.Paid)
    let additionalDriver = await AdditionalDriver.findOne({ email: ADDITIONAL_DRIVER_EMAIL })
    expect(additionalDriver).not.toBeNull()
    expect(additionalDriver?.fullName).toBe(ADDITIONAL_DRIVER.fullName)

    // test success (enableEmailNotifications disabled)
    payload.booking.status = bookcarsTypes.BookingStatus.Reserved
    const driver = await User.findById(DRIVER1_ID)
    driver!.enableEmailNotifications = false
    await driver!.save()
    res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    driver!.enableEmailNotifications = true
    await driver!.save()

    // test failure (wrong _additionalDriver)
    const booking = await Booking.findById(BOOKING_ID)
    expect(booking).not.toBeNull()
    booking!._additionalDriver = testHelper.GetRandromObjectId()
    await booking?.save()
    res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test success (with _additionalDriver)
    payload.booking.additionalDriver = false
    payload.additionalDriver = undefined
    booking!._additionalDriver = new mongoose.Types.ObjectId(ADDITIONAL_DRIVER_ID)
    await booking?.save()
    res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    additionalDriver = await AdditionalDriver.findOne({ email: ADDITIONAL_DRIVER_EMAIL })
    expect(additionalDriver).toBeNull()

    // test success (without _additionalDriver)
    payload.additionalDriver = ADDITIONAL_DRIVER
    booking!._additionalDriver = undefined
    await booking?.save()
    res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const deleteRes = await AdditionalDriver.deleteOne({ email: ADDITIONAL_DRIVER_EMAIL })
    expect(deleteRes.deletedCount).toBe(1)

    // test failure (wrong booking id)
    payload.booking._id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test success (notifyDriver)
    payload.booking._id = BOOKING_ID
    payload.booking.status = bookcarsTypes.BookingStatus.Cancelled
    payload.additionalDriver = undefined
    payload.booking.driver = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const _booking = await Booking.findById(BOOKING_ID)
    expect(_booking?.driver?.toString()).toBe(payload.booking.driver)
    _booking!.driver = new mongoose.Types.ObjectId(DRIVER1_ID)
    await _booking!.save()
    payload.booking.driver = DRIVER1_ID

    // test success (PushToken)
    payload.booking.status = bookcarsTypes.BookingStatus.Void
    let pushToken = new PushToken({ user: payload.booking.driver, token: 'ExponentPushToken[qQ8j_gFiDjl4MKuFxBYLW3]' })
    await pushToken.save()
    res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    await PushToken.deleteOne({ _id: pushToken._id })

    // test success (PushToken)
    payload.booking.status = bookcarsTypes.BookingStatus.Deposit
    pushToken = new PushToken({ user: payload.booking.driver, token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
    await pushToken.save()
    res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    await PushToken.deleteOne({ _id: pushToken._id })

    // test success (PushToken)
    payload.booking.status = bookcarsTypes.BookingStatus.Cancelled
    pushToken = new PushToken({ user: payload.booking.driver, token: '0' })
    await pushToken.save()
    res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    await PushToken.deleteOne({ _id: pushToken._id })

    // test failure (no payload)
    res = await request(app)
      .put('/api/update-booking')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/update-booking-status', () => {
  it('should update booking status', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (change in status)
    const payload: bookcarsTypes.UpdateStatusPayload = {
      ids: [BOOKING_ID],
      status: bookcarsTypes.BookingStatus.Reserved,
    }
    let res = await request(app)
      .post('/api/update-booking-status')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    let booking = await Booking.findById(BOOKING_ID)
    expect(booking?.status).toBe(bookcarsTypes.BookingStatus.Reserved)

    // test success (no change in status)
    res = await request(app)
      .post('/api/update-booking-status')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    booking = await Booking.findById(BOOKING_ID)
    expect(booking?.status).toBe(bookcarsTypes.BookingStatus.Reserved)

    // test failure (no payload)
    res = await request(app)
      .post('/api/update-booking-status')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/booking/:id/:language', () => {
  it('should deny unauthenticated access', async () => {
    const res = await request(app)
      .get(`/api/booking/${BOOKING_ID}/${testHelper.LANGUAGE}`)
    expect(res.statusCode).toBe(403)
  })

  it('should deny unauthorized user (IDOR prevention)', async () => {
    // Sign in as a different user who is neither driver, supplier, nor admin
    const token = await testHelper.signinAsUser()
    const res = await request(app)
      .get(`/api/booking/${BOOKING_ID}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(403)
    await testHelper.signout(token)
  })

  it('should get a booking', async () => {
    const adminToken = await testHelper.signinAsAdmin()
    const driverToken = await testHelper.generateToken(DRIVER1_ID)
    const supplierToken = await testHelper.generateToken(SUPPLIER_ID)

    // test success (admin)
    let res = await request(app)
      .get(`/api/booking/${BOOKING_ID}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, adminToken)
    expect(res.statusCode).toBe(200)
    expect(res.body.car._id).toBe(CAR2_ID)

    // test success (driver owner)
    res = await request(app)
      .get(`/api/booking/${BOOKING_ID}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, driverToken)
    expect(res.statusCode).toBe(200)
    expect(res.body._id).toBe(BOOKING_ID)

    // test success (assigned supplier)
    res = await request(app)
      .get(`/api/booking/${BOOKING_ID}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, supplierToken)
    expect(res.statusCode).toBe(200)
    expect(res.body._id).toBe(BOOKING_ID)

    // test success (unauthenticated guest with valid sessionId)
    const sessionId = nanoid()
    const booking = await Booking.findById(BOOKING_ID)
    booking!.sessionId = sessionId
    await booking!.save()

    res = await request(app)
      .get(`/api/booking/${BOOKING_ID}/${testHelper.LANGUAGE}?sessionId=${sessionId}`)
    expect(res.statusCode).toBe(200)
    expect(res.body._id).toBe(BOOKING_ID)

    // test failure (unauthenticated guest without sessionId)
    res = await request(app)
      .get(`/api/booking/${BOOKING_ID}/${testHelper.LANGUAGE}`)
    expect(res.statusCode).toBe(403)

    // test failure (unauthenticated guest with wrong sessionId)
    res = await request(app)
      .get(`/api/booking/${BOOKING_ID}/${testHelper.LANGUAGE}?sessionId=${nanoid()}`)
    expect(res.statusCode).toBe(403)

    // test failure (unrelated authenticated user)
    const unrelatedDriver = new User({
      fullName: 'Unrelated Driver',
      email: testHelper.GetRandomEmail(),
      language: testHelper.LANGUAGE,
      type: bookcarsTypes.UserType.User,
    })
    await unrelatedDriver.save()
    const unrelatedToken = await testHelper.generateToken(unrelatedDriver._id.toString())

    res = await request(app)
      .get(`/api/booking/${BOOKING_ID}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, unrelatedToken)
    expect(res.statusCode).toBe(403)
    await unrelatedDriver.deleteOne()

    // test success (booking not found)
    res = await request(app)
      .get(`/api/booking/${testHelper.GetRandromObjectIdAsString()}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, adminToken)
    expect(res.statusCode).toBe(204)

    // test failure (wrong booking id)
    res = await request(app)
      .get(`/api/booking/${nanoid()}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, adminToken)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(adminToken)
  })
})

describe('GET /api/booking-id/:sessionId', () => {
  it('should get a booking id from session id', async () => {
    // test success
    const booking = await Booking.findById(BOOKING_ID)
    const sessionId = nanoid()
    booking!.sessionId = sessionId
    await booking!.save()
    let res = await request(app)
      .get(`/api/booking-id/${sessionId}`)
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe(booking!._id.toString())

    // test success (booking not found)
    res = await request(app)
      .get(`/api/booking-id/${nanoid()}`)
    expect(res.statusCode).toBe(204)

    // test failure (lost db connection)
    await databaseHelper.close()
    res = await request(app)
      .get(`/api/booking-id/${nanoid()}`)
    expect(res.statusCode).toBe(400)
    const connRes = await databaseHelper.connect(env.DB_URI, false, false)
    expect(connRes).toBeTruthy()
  })
})

describe('POST /api/bookings/:page/:size/:language', () => {
  it('should get bookings', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (full filter)
    const payload: bookcarsTypes.GetBookingsPayload = {
      suppliers: [SUPPLIER_ID],
      statuses: [bookcarsTypes.BookingStatus.Reserved],
      filter: {
        pickupLocation: LOCATION_ID,
        dropOffLocation: LOCATION_ID,
        from: new Date(2024, 2, 1),
        to: new Date(2024, 2, 4),
        keyword: DRIVER1_NAME,
      },
      user: DRIVER1_ID,
      car: CAR2_ID,
    }

    let res = await request(app)
      .post(`/api/bookings/${testHelper.PAGE}/${testHelper.SIZE}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(1)

    // test success (dateBetween)
    payload.filter!.from = undefined
    payload.filter!.to = undefined
    payload.filter!.dateBetween = new Date(2024, 2, 1)
    res = await request(app)
      .post(`/api/bookings/${testHelper.PAGE}/${testHelper.SIZE}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(1)

    // test success (empty filter)
    payload.user = undefined
    payload.car = undefined
    payload.filter!.from = undefined
    payload.filter!.to = undefined
    payload.filter!.pickupLocation = undefined
    payload.filter!.dropOffLocation = undefined
    payload.filter!.keyword = undefined
    payload.filter!.dateBetween = undefined
    res = await request(app)
      .post(`/api/bookings/${testHelper.PAGE}/${testHelper.SIZE}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(1)

    // test success (keyword filter)
    payload.filter!.keyword = BOOKING_ID
    res = await request(app)
      .post(`/api/bookings/${testHelper.PAGE}/${testHelper.SIZE}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(1)

    // test failure (no payload)
    res = await request(app)
      .post(`/api/bookings/${testHelper.PAGE}/${testHelper.SIZE}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/has-bookings/:driver', () => {
  it("should check driver's bookings", async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (200)
    let res = await request(app)
      .get(`/api/has-bookings/${DRIVER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (204)
    res = await request(app)
      .get(`/api/has-bookings/${SUPPLIER_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)
    const booking = await Booking.findById(BOOKING_ID)
    expect(booking?.status).toBe(bookcarsTypes.BookingStatus.Reserved)

    // test failure (wrong user id)
    res = await request(app)
      .get(`/api/has-bookings/${nanoid()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/cancel-booking/:id', () => {
  it('should cancel a booking', async () => {
    const driverToken = await testHelper.generateToken(DRIVER1_ID)

    // test failure (unauthorized non-owner)
    const unrelatedDriver = new User({
      fullName: 'Unrelated Driver',
      email: testHelper.GetRandomEmail(),
      language: testHelper.LANGUAGE,
      type: bookcarsTypes.UserType.User,
    })
    await unrelatedDriver.save()
    const unrelatedToken = await testHelper.generateToken(unrelatedDriver._id.toString())

    let booking = await Booking.findById(BOOKING_ID)
    expect(booking?.cancelRequest).toBeFalsy()

    let res = await request(app)
      .post(`/api/cancel-booking/${BOOKING_ID}`)
      .set(env.X_ACCESS_TOKEN, unrelatedToken)
    expect(res.statusCode).toBe(403)
    booking = await Booking.findById(BOOKING_ID)
    expect(booking?.cancelRequest).toBeFalsy()
    await unrelatedDriver.deleteOne()

    // test success (authorized owner)
    res = await request(app)
      .post(`/api/cancel-booking/${BOOKING_ID}`)
      .set(env.X_ACCESS_TOKEN, driverToken)
    expect(res.statusCode).toBe(200)
    booking = await Booking.findById(BOOKING_ID)
    expect(booking?.cancelRequest).toBeTruthy()
    await testHelper.deleteNotifications(BOOKING_ID)

    // test failure (supplier not found)
    booking = await Booking.findById(BOOKING_ID)
    booking!.cancelRequest = false
    const supplierId = booking!.supplier
    booking!.supplier = testHelper.GetRandromObjectId()
    await booking!.save()
    res = await request(app)
      .post(`/api/cancel-booking/${BOOKING_ID}`)
      .set(env.X_ACCESS_TOKEN, driverToken)
    expect(res.statusCode).toBe(204)
    booking!.supplier = supplierId
    await booking!.save()

    // test failure (booking not found)
    res = await request(app)
      .post(`/api/cancel-booking/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, driverToken)
    expect(res.statusCode).toBe(204)

    // test failure (wrong booking id)
    res = await request(app)
      .post(`/api/cancel-booking/${nanoid()}`)
      .set(env.X_ACCESS_TOKEN, driverToken)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/delete-bookings', () => {
  it('should delete bookings', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const drivers = [DRIVER1_ID, DRIVER2_ID]
    let bookings = await Booking.find({ driver: { $in: drivers } })
    expect(bookings.length).toBeGreaterThan(0)
    const payload: string[] = bookings.map((u) => u._id.toString())
    let res = await request(app)
      .post('/api/delete-bookings')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    bookings = await Booking.find({ driver: { $in: drivers } })
    expect(bookings.length).toBe(0)
    const additionalDriver = await AdditionalDriver.findOne({ email: ADDITIONAL_DRIVER_EMAIL })
    expect(additionalDriver).toBeNull()

    // test failure (no payload)
    res = await request(app)
      .post('/api/delete-bookings')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('DELETE /api/delete-temp-booking', () => {
  it('should delete temporary booking', async () => {
    const sessionId = testHelper.GetRandromObjectIdAsString()
    const expireAt = new Date()
    expireAt.setSeconds(expireAt.getSeconds() + env.BOOKING_EXPIRE_AT)

    const driver = new User({
      fullName: 'Driver',
      email: testHelper.GetRandomEmail(),
      language: testHelper.LANGUAGE,
      type: bookcarsTypes.UserType.User,
      expireAt,
    })
    await driver.save()

    const booking = new Booking({
      supplier: SUPPLIER_ID,
      car: CAR1_ID,
      driver: driver._id,
      pickupLocation: LOCATION_ID,
      dropOffLocation: LOCATION_ID,
      from: new Date(2024, 2, 1),
      to: new Date(2024, 2, 4),
      status: bookcarsTypes.BookingStatus.Void,
      sessionId,
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

    // test success
    let res = await request(app)
      .delete(`/api/delete-temp-booking/${booking._id.toString()}/${sessionId}`)
    expect(res.statusCode).toBe(200)
    const _booking = await Booking.findById(booking._id)
    expect(_booking).toBeNull()
    const _driver = await User.findById(driver._id)
    expect(_driver).toBeNull()

    // test success (booking not found)
    res = await request(app)
      .delete(`/api/delete-temp-booking/${testHelper.GetRandromObjectIdAsString()}/${sessionId}`)
    expect(res.statusCode).toBe(200)

    // test failure (lost db connection)
    try {
      await databaseHelper.close()
      res = await request(app)
        .delete(`/api/delete-temp-booking/${booking._id.toString()}/${sessionId}`)
      expect(res.statusCode).toBe(400)
    } catch (err) {
      console.error(err)
    } finally {
      const connRes = await databaseHelper.connect(env.DB_URI, false, false)
      expect(connRes).toBeTruthy()
    }
  })
})

describe('Security Regression Tests - Issue #124', () => {
  let supplierBId: string
  let supplierBToken: string
  let supplierAId: string
  let supplierAToken: string
  let bookingBId: string

  beforeAll(async () => {
    // Create Supplier A
    const nameA = testHelper.getSupplierName()
    supplierAId = await testHelper.createSupplier(`${nameA}@testA.bookcars.ma`, nameA)
    supplierAToken = await testHelper.generateToken(supplierAId)

    // Create Supplier B
    const nameB = testHelper.getSupplierName()
    supplierBId = await testHelper.createSupplier(`${nameB}@testB.bookcars.ma`, nameB)
    supplierBToken = await testHelper.generateToken(supplierBId)

    // Create a car for Supplier B
    const carB = new Car({
      name: 'Supplier B Car',
      supplier: supplierBId,
      minimumAge: 21,
      locations: [LOCATION_ID],
      dailyPrice: 100,
      deposit: 500,
      available: true,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 0,
      collisionDamageWaiver: 0,
      fullInsurance: 0,
      additionalDriver: 0,
      range: bookcarsTypes.CarRange.Midi,
      multimedia: [],
      rating: 5,
    })
    await carB.save()

    // Create a booking for Supplier B
    const bookingB = new Booking({
      supplier: supplierBId,
      car: carB._id,
      driver: DRIVER1_ID,
      pickupLocation: LOCATION_ID,
      dropOffLocation: LOCATION_ID,
      from: new Date(2025, 0, 1),
      to: new Date(2025, 0, 5),
      status: bookcarsTypes.BookingStatus.Reserved,
      price: 500,
    })
    await bookingB.save()
    bookingBId = bookingB._id.toString()
  })

  afterAll(async () => {
    await Booking.deleteOne({ _id: bookingBId })
    await Car.deleteMany({ supplier: supplierBId })
    await testHelper.deleteSupplier(supplierAId)
    await testHelper.deleteSupplier(supplierBId)
  })

  it("should prevent Supplier A from retrieving Supplier B's bookings via client-supplied suppliers field", async () => {
    const payload: bookcarsTypes.GetBookingsPayload = {
      suppliers: [supplierBId], // Supplier A attempts to request Supplier B's ID
      statuses: [bookcarsTypes.BookingStatus.Reserved],
    }

    const res = await request(app)
      .post(`/api/bookings/${testHelper.PAGE}/${testHelper.SIZE}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, supplierAToken)
      .send(payload)

    expect(res.statusCode).toBe(200)
    // Supplier A should receive 0 bookings for Supplier B
    expect(res.body[0].resultData.length).toBe(0)
  })

  it('should not disclose driver password in POST /api/bookings list endpoint', async () => {
    const payload: bookcarsTypes.GetBookingsPayload = {
      suppliers: [supplierBId],
      statuses: [bookcarsTypes.BookingStatus.Reserved],
    }

    const res = await request(app)
      .post(`/api/bookings/${testHelper.PAGE}/${testHelper.SIZE}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, supplierBToken)
      .send(payload)

    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)
    const booking = res.body[0].resultData[0]
    expect(booking.driver).toBeDefined()
    expect(booking.driver.password).toBeUndefined()
  })

  it('should not disclose driver password in GET /api/booking/:id detail endpoint', async () => {
    const res = await request(app)
      .get(`/api/booking/${bookingBId}/${testHelper.LANGUAGE}`)
      .set(env.X_ACCESS_TOKEN, supplierBToken)

    expect(res.statusCode).toBe(200)
    expect(res.body.driver).toBeDefined()
    expect(res.body.driver.password).toBeUndefined()
  })
})
