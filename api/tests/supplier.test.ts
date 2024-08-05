import 'dotenv/config'
import request from 'supertest'
import url from 'url'
import path from 'path'
import fs from 'node:fs/promises'
import { v1 as uuid } from 'uuid'
import mongoose from 'mongoose'
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
    price: 78,
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
    theftProtection: 90,
    collisionDamageWaiver: 120,
    fullInsurance: 200,
    additionalDriver: 200,
    range: bookcarsTypes.CarRange.Midi,
  })
  await car1.save()
  CAR1_ID = car1.id

  const car2 = new Car({
    name: 'Fiat 500',
    supplier: SUPPLIER2_ID,
    minimumAge: 21,
    locations: [LOCATION_ID],
    price: 42,
    deposit: 750,
    available: true,
    type: bookcarsTypes.CarType.Diesel,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    aircon: true,
    image: undefined,
    seats: 5,
    doors: 4,
    fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
    mileage: -1,
    cancellation: 0,
    amendments: 0,
    theftProtection: 90,
    collisionDamageWaiver: 120,
    fullInsurance: 200,
    additionalDriver: 200,
    range: bookcarsTypes.CarRange.Midi,
  })
  await car2.save()
  CAR2_ID = car2.id
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  if (mongoose.connection.readyState) {
    await testHelper.close()

    // delete suppliers
    await testHelper.deleteSupplier(SUPPLIER1_ID)
    await testHelper.deleteSupplier(SUPPLIER2_ID)

    // delete cars
    await Car.deleteMany({ _id: { $in: [CAR1_ID, CAR2_ID] } })

    await databaseHelper.close()
  }
})

//
// Unit tests
//

describe('POST /api/validate-supplier', () => {
  it('should validate a supplier', async () => {
    const token = await testHelper.signinAsAdmin()

    let payload: bookcarsTypes.ValidateSupplierPayload = { fullName: SUPPLIER1_NAME }
    let res = await request(app)
      .post('/api/validate-supplier')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload = { fullName: testHelper.getSupplierName() }
    res = await request(app)
      .post('/api/validate-supplier')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)

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

    payload._id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .put('/api/update-supplier')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

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

    let res = await request(app)
      .get(`/api/supplier/${SUPPLIER1_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.fullName).toBe(SUPPLIER1_NAME)

    res = await request(app)
      .get(`/api/supplier/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

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

    let res = await request(app)
      .get(`/api/suppliers/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(1)

    res = await request(app)
      .get(`/api/suppliers/unknown/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    res = await request(app)
      .get(`/api/suppliers/${testHelper.PAGE}/${testHelper.SIZE}?s=${uuid()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

    await testHelper.signout(token)
  })
})

describe('GET /api/all-suppliers', () => {
  it('should get all suppliers', async () => {
    let res = await request(app)
      .get('/api/all-suppliers')
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(1)

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

    let supplierName = testHelper.getSupplierName()
    let supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    let supplier = await User.findById(supplierId)
    expect(supplier).not.toBeNull()
    let avatarName = 'avatar1.jpg'
    let avatarPath = path.resolve(__dirname, `./img/${avatarName}`)
    let avatar = path.join(env.CDN_USERS, avatarName)
    if (!await helper.exists(avatar)) {
      fs.copyFile(avatarPath, avatar)
    }
    supplier!.avatar = avatarName
    await supplier?.save()
    let locationId = await testHelper.createLocation('Location 1 EN', 'Location 1 FR')
    const carImageName = 'bmw-x1.jpg'
    const carImagePath = path.resolve(__dirname, `./img/${carImageName}`)
    let car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      price: 780,
      deposit: 9500,
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
      theftProtection: 90,
      collisionDamageWaiver: 120,
      fullInsurance: 200,
      additionalDriver: 200,
      range: bookcarsTypes.CarRange.Midi,
    })
    const carImage = path.join(env.CDN_CARS, carImageName)
    if (!await helper.exists(carImage)) {
      fs.copyFile(carImagePath, carImage)
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
    let res = await request(app)
      .delete(`/api/delete-supplier/${supplierId}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    supplier = await User.findById(supplierId)
    expect(supplier).toBeNull()
    await testHelper.deleteLocation(locationId)

    res = await request(app)
      .delete(`/api/delete-supplier/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .delete('/api/delete-supplier/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

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

    supplierName = testHelper.getSupplierName()
    supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    supplier = await User.findById(supplierId)
    expect(supplier).not.toBeNull()
    supplier!.avatar = `${uuid()}.jpg`
    await supplier?.save()
    locationId = await testHelper.createLocation('Location 1 EN', 'Location 1 FR')
    car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      price: 780,
      deposit: 9500,
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
      theftProtection: 90,
      collisionDamageWaiver: 120,
      fullInsurance: 200,
      additionalDriver: 200,
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

    supplierName = testHelper.getSupplierName()
    supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    supplier = await User.findById(supplierId)
    expect(supplier).not.toBeNull()
    avatarName = 'avatar1.jpg'
    avatarPath = path.resolve(__dirname, `./img/${avatarName}`)
    avatar = path.join(env.CDN_USERS, avatarName)
    if (!await helper.exists(avatar)) {
      fs.copyFile(avatarPath, avatar)
    }
    supplier!.avatar = avatarName
    await supplier?.save()
    locationId = await testHelper.createLocation('Location 1 EN', 'Location 1 FR')
    car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [locationId],
      price: 780,
      deposit: 9500,
      available: false,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      image: `${uuid()}.jpg`,
      seats: 5,
      doors: 4,
      fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
      mileage: -1,
      cancellation: 0,
      amendments: 0,
      theftProtection: 90,
      collisionDamageWaiver: 120,
      fullInsurance: 200,
      additionalDriver: 200,
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
    const payload: bookcarsTypes.GetCarsPayload = {
      pickupLocation: LOCATION_ID,
      carType: [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline],
      gearbox: [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic],
      mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
      fuelPolicy: [bookcarsTypes.FuelPolicy.FreeTank, bookcarsTypes.FuelPolicy.FreeTank],
      deposit: -1,
    }

    let res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(2)
    expect(res.body[0].carCount).toBe(1)
    expect(res.body[1].carCount).toBe(1)

    res = await request(app)
      .post('/api/frontend-suppliers')
    expect(res.statusCode).toBe(400)

    payload.mileage = [bookcarsTypes.Mileage.Unlimited]
    res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)

    payload.mileage = [bookcarsTypes.Mileage.Limited]
    res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)

    payload.mileage = []
    res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(0)

    payload.mileage = [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited]
    payload.deposit = 1200
    res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(2)

    // carSpecs
    payload.carSpecs = {}
    payload.carSpecs.aircon = true
    payload.carSpecs.moreThanFiveSeats = true
    payload.carSpecs.moreThanFourDoors = true
    res = await request(app)
      .post('/api/frontend-suppliers')
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)
  })
})

describe('POST /api/backend-suppliers', () => {
  it('should return backend suppliers', async () => {
    const token = await testHelper.signinAsAdmin()

    const payload: bookcarsTypes.GetCarsPayload = {
      pickupLocation: LOCATION_ID,
      carType: [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline],
      gearbox: [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic],
      mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
      fuelPolicy: [bookcarsTypes.FuelPolicy.FreeTank, bookcarsTypes.FuelPolicy.FreeTank],
      deposit: -1,
    }

    let res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    payload.mileage = [bookcarsTypes.Mileage.Unlimited]
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    payload.mileage = [bookcarsTypes.Mileage.Limited]
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    payload.mileage = []
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(0)

    payload.mileage = [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited]
    payload.deposit = 1200
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    // carSpecs
    payload.carSpecs = {}
    payload.carSpecs.aircon = true
    payload.carSpecs.moreThanFiveSeats = true
    payload.carSpecs.moreThanFourDoors = true
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    payload.availability = [bookcarsTypes.Availablity.Available]
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    payload.availability = [bookcarsTypes.Availablity.Unavailable]
    res = await request(app)
      .post('/api/backend-suppliers')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(0)

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
