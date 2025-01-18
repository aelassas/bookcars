import 'dotenv/config'
import request from 'supertest'
import url from 'url'
import path from 'path'
import fs from 'node:fs/promises'
import { nanoid } from 'nanoid'
import * as bookcarsTypes from ':bookcars-types'
import * as databaseHelper from '../src/common/databaseHelper'
import * as testHelper from './testHelper'
import app from '../src/app'
import * as env from '../src/config/env.config'
import * as helper from '../src/common/helper'
import User from '../src/models/User'
import Car from '../src/models/Car'
import Booking from '../src/models/Booking'
import AdditionalDriver from '../src/models/AdditionalDriver'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONTRACT1 = 'contract1.pdf'
const CONTRACT1_PATH = path.join(__dirname, `./contracts/${CONTRACT1}`)
const CONTRACT2 = 'contract2.pdf'
const CONTRACT2_PATH = path.join(__dirname, `./contracts/${CONTRACT2}`)

const LOCATION_ID = testHelper.GetRandromObjectIdAsString()

let SUPPLIER1_ID: string
let SUPPLIER2_ID: string
let SUPPLIER1_NAME: string
let CAR1_ID: string
let CAR2_ID: string

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  const res = await databaseHelper.connect(env.DB_URI, false, false)
  expect(res).toBeTruthy()
  await testHelper.initialize()

  // create two suppliers
  SUPPLIER1_NAME = testHelper.getSupplierName()
  const supplierName2 = testHelper.getSupplierName()
  SUPPLIER1_ID = await testHelper.createSupplier(`${SUPPLIER1_NAME}@test.bookcars.ma`, SUPPLIER1_NAME)
  SUPPLIER2_ID = await testHelper.createSupplier(`${supplierName2}@test.bookcars.ma`, supplierName2)

  // create two cars
  const car1 = new Car({
    name: 'BMW X1',
    supplier: SUPPLIER1_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
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
  await car1.save()
  CAR1_ID = car1.id

  const car2 = new Car({
    name: 'Fiat 500',
    supplier: SUPPLIER2_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    dailyPrice: 42,
    deposit: 750,
    available: true,
    type: bookcarsTypes.CarType.Diesel,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    image: undefined,
    seats: 6,
    doors: 5,
    fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
    mileage: -1,
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
  await car2.save()
  CAR2_ID = car2.id
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  await testHelper.close()

  // delete suppliers
  await testHelper.deleteSupplier(SUPPLIER1_ID)
  await testHelper.deleteSupplier(SUPPLIER2_ID)

  // delete cars
  await Car.deleteMany({ _id: { $in: [CAR1_ID, CAR2_ID] } })

  await databaseHelper.close()
})

//
// Unit tests
//

describe('POST /api/validate-supplier', () => {
  it('should validate a supplier', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (supplier not found)
    let payload: bookcarsTypes.ValidateSupplierPayload = { fullName: SUPPLIER1_NAME }
    let res = await request(app)
      .post('/api/validate-supplier')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test success (supplier found)
    payload = { fullName: testHelper.getSupplierName() }
    res = await request(app)
      .post('/api/validate-supplier')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

    // test failure (no payload)
    res = await request(app)
      .post('/api/validate-supplier')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('PUT /api/update-supplier', () => {
  it('should update a supplier', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    SUPPLIER1_NAME = testHelper.getSupplierName()
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
      minimumRentalDays: 3,
      licenseRequired: true,
    }
    let res = await request(app)
      .put('/api/update-supplier')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.fullName).toBe(SUPPLIER1_NAME)
    expect(res.body.bio).toBe(bio)
    expect(res.body.location).toBe(location)
    expect(res.body.phone).toBe(phone)
    expect(res.body.payLater).toBeFalsy()
    expect(res.body.minimumRentalDays).toBe(3)
    expect(res.body.licenseRequired).toBeTruthy()

    // test success (supplier not found)
    payload._id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .put('/api/update-supplier')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test failure (no payload)
    res = await request(app)
      .put('/api/update-supplier')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/supplier/:id', () => {
  it('should get a supplier', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (supplier found)
    let res = await request(app)
      .get(`/api/supplier/${SUPPLIER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.fullName).toBe(SUPPLIER1_NAME)

    // test success (supplier not found)
    res = await request(app)
      .get(`/api/supplier/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test failure (wrong supplier id)
    res = await request(app)
      .get('/api/supplier/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/suppliers/:page/:size', () => {
  it('should get suppliers', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let res = await request(app)
      .get(`/api/suppliers/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(1)

    // test failure (wrong page number)
    res = await request(app)
      .get(`/api/suppliers/unknown/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test success (expect no result)
    res = await request(app)
      .get(`/api/suppliers/${testHelper.PAGE}/${testHelper.SIZE}?s=${nanoid()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

    await testHelper.signout(token)
  })
})

describe('GET /api/all-suppliers', () => {
  it('should get all suppliers', async () => {
    // test success
    let res = await request(app)
      .get('/api/all-suppliers')
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(1)

    // test failure (lost db connection)
    await databaseHelper.close()
    res = await request(app)
      .get('/api/all-suppliers')
    expect(res.statusCode).toBe(400)
    expect(await databaseHelper.connect(env.DB_URI, false, false)).toBeTruthy()
  })
})

describe('DELETE /api/delete-supplier/:id', () => {
  it('should delete a supplier', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (no avatar no contracts)
    let supplierName = testHelper.getSupplierName()
    let supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    let supplier = await User.findById(supplierId)
    expect(supplier).toBeTruthy()
    supplier!.avatar = ''
    supplier!.contracts = undefined
    await supplier!.save()
    let res = await request(app)
      .delete(`/api/delete-supplier/${supplierId}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    supplier = await User.findById(supplierId)
    expect(supplier).toBeNull()

    // test success (no avatar no contract files)
    supplierName = testHelper.getSupplierName()
    supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    supplier = await User.findById(supplierId)
    expect(supplier).toBeTruthy()
    supplier!.contracts = [{ language: 'en', file: null }]
    await supplier!.save()
    res = await request(app)
      .delete(`/api/delete-supplier/${supplierId}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    supplier = await User.findById(supplierId)
    expect(supplier).toBeNull()

    // test success (no avatar contract file not found)
    supplierName = testHelper.getSupplierName()
    supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    supplier = await User.findById(supplierId)
    expect(supplier).toBeTruthy()
    supplier!.contracts = [{ language: 'en', file: `${nanoid()}.pdf` }]
    await supplier!.save()
    res = await request(app)
      .delete(`/api/delete-supplier/${supplierId}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    supplier = await User.findById(supplierId)
    expect(supplier).toBeNull()

    // test success (avatar and contracts)
    supplierName = testHelper.getSupplierName()
    supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    supplier = await User.findById(supplierId)
    expect(supplier).toBeTruthy()
    let avatarName = 'avatar1.jpg'
    let avatarPath = path.join(__dirname, `./img/${avatarName}`)
    let avatar = path.join(env.CDN_USERS, avatarName)
    if (!await helper.exists(avatar)) {
      await fs.copyFile(avatarPath, avatar)
    }
    supplier!.avatar = avatarName

    const contractFileName = `${nanoid()}.pdf`
    const contractFile = path.join(env.CDN_CONTRACTS, contractFileName)
    if (!await helper.exists(contractFile)) {
      await fs.copyFile(CONTRACT1_PATH, contractFile)
    }
    supplier!.contracts = [{ language: 'en', file: contractFileName }]

    await supplier?.save()
    let locationId = await testHelper.createLocation('Location 1 EN', 'Location 1 FR')
    const carImageName = 'bmw-x1.jpg'
    const carImagePath = path.join(__dirname, `./img/${carImageName}`)
    let car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      dailyPrice: 78,
      deposit: 950,
      available: false,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      image: carImageName,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 9,
      collisionDamageWaiver: 12,
      fullInsurance: 20,
      additionalDriver: 20,
      range: bookcarsTypes.CarRange.Midi,
    })
    const carImage = path.join(env.CDN_CARS, carImageName)
    if (!await helper.exists(carImage)) {
      await fs.copyFile(carImagePath, carImage)
    }
    await car.save()
    const additionalDriver = new AdditionalDriver({
      email: testHelper.GetRandomEmail(),
      fullName: 'additional-driver',
      phone: '01010101',
      birthDate: new Date(1990, 2, 3),
    })
    await additionalDriver.save()
    const booking = new Booking({
      supplier: supplierId,
      car: car._id,
      driver: testHelper.getUserId(),
      pickupLocation: locationId,
      dropOffLocation: locationId,
      from: new Date(2024, 2, 1),
      to: new Date(1990, 2, 4),
      status: bookcarsTypes.BookingStatus.Pending,
      cancellation: true,
      amendments: true,
      theftProtection: false,
      collisionDamageWaiver: false,
      fullInsurance: false,
      price: 312,
      additionalDriver: true,
      _additionalDriver: additionalDriver._id,
    })
    await booking.save()
    res = await request(app)
      .delete(`/api/delete-supplier/${supplierId}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    supplier = await User.findById(supplierId)
    expect(supplier).toBeNull()
    expect(await helper.exists(avatar)).toBeFalsy()
    expect(await helper.exists(contractFile)).toBeFalsy()
    await testHelper.deleteLocation(locationId)

    // test success (supplier not found)
    res = await request(app)
      .delete(`/api/delete-supplier/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test failure (wrong supplier id)
    res = await request(app)
      .delete('/api/delete-supplier/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test success (no avatar)
    supplierName = testHelper.getSupplierName()
    supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    supplier = await User.findById(supplierId)
    expect(supplier).not.toBeNull()
    await supplier?.save()
    res = await request(app)
      .delete(`/api/delete-supplier/${supplierId}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    supplier = await User.findById(supplierId)
    expect(supplier).toBeNull()

    // test success (avatar not found)
    supplierName = testHelper.getSupplierName()
    supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    supplier = await User.findById(supplierId)
    expect(supplier).not.toBeNull()
    supplier!.avatar = `${nanoid()}.jpg`
    await supplier?.save()
    locationId = await testHelper.createLocation('Location 1 EN', 'Location 1 FR')
    car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      dailyPrice: 78,
      deposit: 950,
      available: false,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      image: '',
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 9,
      collisionDamageWaiver: 12,
      fullInsurance: 20,
      additionalDriver: 20,
      range: bookcarsTypes.CarRange.Midi,
    })
    await car.save()
    res = await request(app)
      .delete(`/api/delete-supplier/${supplierId}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    supplier = await User.findById(supplierId)
    expect(supplier).toBeNull()
    await testHelper.deleteLocation(locationId)

    // test success (avatar found)
    supplierName = testHelper.getSupplierName()
    supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    supplier = await User.findById(supplierId)
    expect(supplier).not.toBeNull()
    avatarName = 'avatar1.jpg'
    avatarPath = path.join(__dirname, `./img/${avatarName}`)
    avatar = path.join(env.CDN_USERS, avatarName)
    if (!await helper.exists(avatar)) {
      await fs.copyFile(avatarPath, avatar)
    }
    supplier!.avatar = avatarName
    await supplier?.save()
    locationId = await testHelper.createLocation('Location 1 EN', 'Location 1 FR')
    car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      dailyPrice: 78,
      deposit: 950,
      available: false,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      image: `${nanoid()}.jpg`,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 9,
      collisionDamageWaiver: 12,
      fullInsurance: 20,
      additionalDriver: 20,
      range: bookcarsTypes.CarRange.Midi,
    })
    await car.save()
    res = await request(app)
      .delete(`/api/delete-supplier/${supplierId}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    supplier = await User.findById(supplierId)
    expect(supplier).toBeNull()
    await testHelper.deleteLocation(locationId)

    await testHelper.signout(token)
  })
})

describe('POST /api/frontend-suppliers', () => {
  it('should return frontend suppliers', async () => {
    // test success (full filter)
    const payload: bookcarsTypes.GetCarsPayload = {
      pickupLocation: LOCATION_ID,
      carType: [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline],
      gearbox: [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic],
      mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
      fuelPolicy: [bookcarsTypes.FuelPolicy.FreeTank, bookcarsTypes.FuelPolicy.FreeTank],
      deposit: -1,
      multimedia: [
        bookcarsTypes.CarMultimedia.AndroidAuto,
      ],
      rating: 4,
      seats: 6,
      carSpecs: {
        aircon: true,
        moreThanFiveSeats: true,
        moreThanFourDoors: true,
      },
      ranges: [bookcarsTypes.CarRange.Midi],
      days: 3,
    }
    let res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(2)
    expect(res.body[0].carCount).toBe(1)
    expect(res.body[1].carCount).toBe(1)

    payload.days = undefined
    res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(2)
    expect(res.body[0].carCount).toBe(1)
    expect(res.body[1].carCount).toBe(1)

    // test failure (no payload)
    res = await request(app)
      .post('/api/frontend-suppliers')
    expect(res.statusCode).toBe(400)

    // test success (no carSpecs, no seats)
    payload.carSpecs!.aircon = undefined
    payload.carSpecs!.moreThanFourDoors = undefined
    payload.carSpecs!.moreThanFiveSeats = undefined
    payload.seats = -1
    payload.mileage = [bookcarsTypes.Mileage.Unlimited]
    res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)
    payload.carSpecs!.aircon = true
    payload.carSpecs!.moreThanFourDoors = true
    payload.carSpecs!.moreThanFiveSeats = true
    payload.seats = 6

    // test success (carSpecs, seats)
    payload.mileage = [bookcarsTypes.Mileage.Limited]
    res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)

    // test success (no mileage)
    payload.mileage = []
    res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(0)

    // test success (mileage)
    payload.mileage = [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited]
    payload.deposit = 1200
    res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(2)

    // test success (seats)
    payload.seats = 3
    res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(0)
  })
})

describe('POST /api/backend-suppliers', () => {
  it('should return backend suppliers', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (full filter)
    const payload: bookcarsTypes.GetCarsPayload = {
      carType: [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline],
      gearbox: [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic],
      mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
      fuelPolicy: [bookcarsTypes.FuelPolicy.FreeTank, bookcarsTypes.FuelPolicy.FreeTank],
      deposit: -1,
      multimedia: [
        bookcarsTypes.CarMultimedia.AndroidAuto,
      ],
      rating: 4,
      seats: 6,
      carSpecs: {
        aircon: true,
        moreThanFiveSeats: true,
        moreThanFourDoors: true,
      },
      ranges: [bookcarsTypes.CarRange.Midi],
    }
    let res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    // test failure (no payload)
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test success (no carSpecs, no seats)
    payload.carSpecs!.aircon = undefined
    payload.carSpecs!.moreThanFourDoors = undefined
    payload.carSpecs!.moreThanFiveSeats = undefined
    payload.seats = -1
    payload.mileage = [bookcarsTypes.Mileage.Unlimited]
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    payload.carSpecs!.aircon = true
    payload.carSpecs!.moreThanFourDoors = true
    payload.carSpecs!.moreThanFiveSeats = true
    payload.seats = 6

    // test success (carSpecs, seats)
    payload.mileage = [bookcarsTypes.Mileage.Limited]
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    // test success (no mileage)
    payload.mileage = []
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(0)

    // test success (no mileage)
    payload.mileage = [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited]
    payload.deposit = 1200
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    // test success (seats)
    payload.seats = 3
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(0)
    payload.seats = 6

    // test success (availability)
    payload.availability = [bookcarsTypes.Availablity.Available]
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    // test success (availability)
    payload.availability = [bookcarsTypes.Availablity.Unavailable]
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(0)

    // test success (availability)
    payload.availability = [bookcarsTypes.Availablity.Available, bookcarsTypes.Availablity.Unavailable]
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    payload.availability = undefined

    // test success (no availability)
    payload.availability = []
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(0)

    await testHelper.signout(token)
  })
})

describe('POST /api/create-contract', () => {
  it('should create a contract', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let res = await request(app)
      .post('/api/create-contract/en')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', CONTRACT1_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    const filePath = path.join(env.CDN_TEMP_CONTRACTS, filename)
    const contractExists = await helper.exists(filePath)
    expect(contractExists).toBeTruthy()
    await fs.unlink(filePath)

    // test failure (file not sent)
    res = await request(app)
      .post('/api/create-contract/en')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test failure (filename not valid)
    const invalidContract = path.join(env.CDN_TEMP_CONTRACTS, `${nanoid()}`)
    await fs.copyFile(CONTRACT1_PATH, invalidContract)
    res = await request(app)
      .post('/api/create-contract/en')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', invalidContract)
    expect(res.statusCode).toBe(400)
    await fs.unlink(invalidContract)

    // test failure (language not valid)
    res = await request(app)
      .post('/api/create-contract/english')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', CONTRACT1_PATH)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/update-contract/:id', () => {
  it('should update a contract', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (no initial contract)
    let supplier = await User.findById(SUPPLIER1_ID)
    let res = await request(app)
      .post(`/api/update-contract/${SUPPLIER1_ID}/en`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', CONTRACT1_PATH)
    expect(res.statusCode).toBe(200)
    let filename = res.body as string
    expect(filename).toBeTruthy()
    expect(await helper.exists(path.join(env.CDN_CONTRACTS, filename))).toBeTruthy()
    supplier = await User.findById(SUPPLIER1_ID)
    expect(supplier).toBeTruthy()
    expect(supplier?.contracts?.find((c) => c.language === 'en')?.file).toBe(filename)

    // test success (initial contract)
    res = await request(app)
      .post(`/api/update-contract/${SUPPLIER1_ID}/en`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', CONTRACT2_PATH)
    expect(res.statusCode).toBe(200)
    filename = res.body as string
    expect(filename).toBeTruthy()
    expect(await helper.exists(path.join(env.CDN_CONTRACTS, filename))).toBeTruthy()
    supplier = await User.findById(SUPPLIER1_ID)
    expect(filename).toBe(supplier?.contracts?.find((c) => c.language === 'en')?.file)

    // test success (contract file does not exist)
    supplier!.contracts!.find((c) => c.language === 'en')!.file = `${nanoid()}.pdf`
    await supplier?.save()
    res = await request(app)
      .post(`/api/update-contract/${SUPPLIER1_ID}/en`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', CONTRACT1_PATH)
    expect(res.statusCode).toBe(200)
    filename = res.body as string
    expect(filename).toBeTruthy()
    expect(await helper.exists(path.join(env.CDN_CONTRACTS, filename))).toBeTruthy()
    supplier = await User.findById(SUPPLIER1_ID)
    expect(filename).toBe(supplier?.contracts?.find((c) => c.language === 'en')?.file)
    supplier!.contracts!.find((c) => c.language === 'en')!.file = filename
    await supplier?.save()

    // test failure (file not sent)
    res = await request(app)
      .post(`/api/update-contract/${SUPPLIER1_ID}/en`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test failure (filename not valid)
    const invalidContract = path.join(env.CDN_TEMP_CONTRACTS, `${nanoid()}`)
    await fs.copyFile(CONTRACT1_PATH, invalidContract)
    res = await request(app)
      .post(`/api/update-contract/${SUPPLIER1_ID}/en`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', invalidContract)
    expect(res.statusCode).toBe(400)
    await fs.unlink(invalidContract)

    // test failure (supplier not found)
    res = await request(app)
      .post(`/api/update-contract/${testHelper.GetRandromObjectIdAsString()}/en`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', CONTRACT1_PATH)
    expect(res.statusCode).toBe(204)

    // test failure (supplier id not valid)
    res = await request(app)
      .post('/api/update-contract/0/en')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', CONTRACT1_PATH)
    expect(res.statusCode).toBe(400)

    // test failure (language not valid)
    res = await request(app)
      .post(`/api/update-contract/${testHelper.GetRandromObjectIdAsString()}/english`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('file', CONTRACT1_PATH)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-contract/:id', () => {
  it('should delete a contract', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let supplier = await User.findById(SUPPLIER1_ID)
    expect(supplier).toBeTruthy()
    expect(supplier?.contracts?.find((c) => c.language === 'en')?.file).toBeTruthy()
    const filename = supplier?.contracts?.find((c) => c.language === 'en')?.file as string
    let imageExists = await helper.exists(path.join(env.CDN_CONTRACTS, filename))
    expect(imageExists).toBeTruthy()
    let res = await request(app)
      .post(`/api/delete-contract/${SUPPLIER1_ID}/en`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    imageExists = await helper.exists(path.join(env.CDN_CONTRACTS, filename))
    expect(imageExists).toBeFalsy()
    supplier = await User.findById(SUPPLIER1_ID)
    expect(supplier?.contracts?.find((c) => c.language === 'en')?.file).toBeFalsy()

    // test success (no contract)
    supplier = await User.findById(SUPPLIER1_ID)
    expect(supplier).toBeTruthy()
    supplier!.contracts = undefined
    await supplier!.save()
    res = await request(app)
      .post(`/api/delete-contract/${SUPPLIER1_ID}/en`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (contract with no file)
    supplier = await User.findById(SUPPLIER1_ID)
    expect(supplier).toBeTruthy()
    supplier!.contracts = [{ language: 'en', file: null }]
    await supplier!.save()
    res = await request(app)
      .post(`/api/delete-contract/${SUPPLIER1_ID}/en`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (contract with file not found)
    supplier = await User.findById(SUPPLIER1_ID)
    expect(supplier).toBeTruthy()
    supplier!.contracts = [{ language: 'en', file: `${nanoid()}.pdf` }]
    await supplier!.save()
    res = await request(app)
      .post(`/api/delete-contract/${SUPPLIER1_ID}/en`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test failure (supplier not found)
    res = await request(app)
      .post(`/api/delete-contract/${testHelper.GetRandromObjectIdAsString()}/en`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test failure (supplier id not valid)
    res = await request(app)
      .post('/api/delete-contract/invalid-id/en')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test failure (language id not valid)
    res = await request(app)
      .post(`/api/delete-contract/${testHelper.GetRandromObjectIdAsString()}/english`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-temp-contract/:image', () => {
  it('should delete a temporary contract', async () => {
    const token = await testHelper.signinAsAdmin()

    // init
    const tempImage = path.join(env.CDN_TEMP_CONTRACTS, CONTRACT1)
    if (!await helper.exists(tempImage)) {
      await fs.copyFile(CONTRACT1_PATH, tempImage)
    }

    // test success (temp file exists)
    let res = await request(app)
      .post(`/api/delete-temp-contract/${CONTRACT1}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    const tempImageExists = await helper.exists(tempImage)
    expect(tempImageExists).toBeFalsy()

    // test success (temp file not found)
    res = await request(app)
      .post('/api/delete-temp-contract/unknown.pdf')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test failure (temp file not valid)
    res = await request(app)
      .post('/api/delete-temp-contract/unknown')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})
