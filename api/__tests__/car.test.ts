import 'dotenv/config'
import request from 'supertest'
import url from 'url'
import path from 'path'
import fs from 'node:fs/promises'
import { nanoid } from 'nanoid'
import * as bookcarsTypes from ':bookcars-types'
import * as databaseHelper from '../src/common/databaseHelper'
import app from '../src/app'
import * as env from '../src/config/env.config'
import * as testHelper from './testHelper'
import * as helper from '../src/common/helper'
import Car from '../src/models/Car'
import Booking from '../src/models/Booking'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IMAGE1 = 'bmw-x1.jpg'
const IMAGE1_PATH = path.join(__dirname, `./img/${IMAGE1}`)
const IMAGE2 = 'bmw-x5.jpg'
const IMAGE2_PATH = path.join(__dirname, `./img/${IMAGE2}`)

let SUPPLIER1_ID: string
let SUPPLIER2_ID: string
let LOCATION1_ID: string
let LOCATION2_ID: string
let CAR_ID: string

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  const res = await databaseHelper.connect(env.DB_URI, false, false)
  expect(res).toBeTruthy()

  await testHelper.initialize()

  // create two suppliers
  const supplierName1 = testHelper.getSupplierName()
  SUPPLIER1_ID = await testHelper.createSupplier(`${supplierName1}@test.bookcars.ma`, supplierName1)
  const supplierName2 = testHelper.getSupplierName()
  SUPPLIER2_ID = await testHelper.createSupplier(`${supplierName2}@test.bookcars.ma`, supplierName2)

  // create two locations
  LOCATION1_ID = await testHelper.createLocation('Location 1 EN', 'Location 1 FR')
  LOCATION2_ID = await testHelper.createLocation('Location 2 EN', 'Location 2 FR')
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  await testHelper.close()

  // delete suppliers
  await testHelper.deleteSupplier(SUPPLIER1_ID)
  await testHelper.deleteSupplier(SUPPLIER2_ID)

  // delete locations
  await testHelper.deleteLocation(LOCATION1_ID)
  await testHelper.deleteLocation(LOCATION2_ID)

  await databaseHelper.close()
})

//
// Unit tests
//

describe('POST /api/create-car', () => {
  it('should create a car', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const tempImage = path.join(env.CDN_TEMP_CARS, IMAGE1)
    if (!await helper.exists(tempImage)) {
      await fs.copyFile(IMAGE1_PATH, tempImage)
    }
    const payload: bookcarsTypes.CreateCarPayload = {
      name: 'BMW X1',
      supplier: SUPPLIER1_ID,
      minimumAge: 21,
      locations: [LOCATION1_ID],
      dailyPrice: 78,
      discountedDailyPrice: 70,
      biWeeklyPrice: 210,
      discountedBiWeeklyPrice: 200,
      weeklyPrice: 490,
      discountedWeeklyPrice: 470,
      monthlyPrice: 2100,
      discountedMonthlyPrice: 2000,
      deposit: 950,
      available: false,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: false,
      image: IMAGE1,
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
      range: bookcarsTypes.CarRange.Mini,
      multimedia: [bookcarsTypes.CarMultimedia.Bluetooth],
      rating: 3,
    }
    let res = await request(app)
      .post('/api/create-car')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const car = res.body
    expect(car.name).toBe(payload.name)
    expect(car.supplier).toBe(payload.supplier)
    expect(car.minimumAge).toBe(payload.minimumAge)
    expect(car.locations).toStrictEqual(payload.locations)
    expect(car.dailyPrice).toBe(payload.dailyPrice)
    expect(car.discountedDailyPrice).toBe(payload.discountedDailyPrice)
    expect(car.biWeeklyPrice).toBe(payload.biWeeklyPrice)
    expect(car.discountedBiWeeklyPrice).toBe(payload.discountedBiWeeklyPrice)
    expect(car.weeklyPrice).toBe(payload.weeklyPrice)
    expect(car.discountedWeeklyPrice).toBe(payload.discountedWeeklyPrice)
    expect(car.monthlyPrice).toBe(payload.monthlyPrice)
    expect(car.discountedMonthlyPrice).toBe(payload.discountedMonthlyPrice)
    expect(car.deposit).toBe(payload.deposit)
    expect(car.available).toBe(payload.available)
    expect(car.type).toBe(payload.type)
    expect(car.gearbox).toBe(payload.gearbox)
    expect(car.aircon).toBe(payload.aircon)
    expect(car.seats).toBe(payload.seats)
    expect(car.doors).toBe(payload.doors)
    expect(car.fuelPolicy).toBe(payload.fuelPolicy)
    expect(car.mileage).toBe(payload.mileage)
    expect(car.cancellation).toBe(payload.cancellation)
    expect(car.amendments).toBe(payload.amendments)
    expect(car.theftProtection).toBe(payload.theftProtection)
    expect(car.collisionDamageWaiver).toBe(payload.collisionDamageWaiver)
    expect(car.fullInsurance).toBe(payload.fullInsurance)
    expect(car.additionalDriver).toBe(payload.additionalDriver)
    expect(car.range).toBe(payload.range)
    expect(car.multimedia).toStrictEqual(payload.multimedia)
    expect(car.rating).toBe(payload.rating)
    CAR_ID = res.body._id

    // test failure (no image)
    payload.image = undefined
    res = await request(app)
      .post('/api/create-car')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (image not found)
    payload.image = 'unknown.jpg'
    res = await request(app)
      .post('/api/create-car')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('PUT /api/update-car', () => {
  it('should update a car', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const payload: bookcarsTypes.UpdateCarPayload = {
      _id: CAR_ID,
      name: 'BMW X5',
      supplier: SUPPLIER2_ID,
      minimumAge: 23,
      locations: [LOCATION2_ID],
      dailyPrice: 98,
      discountedDailyPrice: 90,
      biWeeklyPrice: 270,
      discountedBiWeeklyPrice: 250,
      weeklyPrice: 630,
      discountedWeeklyPrice: 600,
      monthlyPrice: 2700,
      discountedMonthlyPrice: 2500,
      deposit: 1050,
      available: true,
      type: bookcarsTypes.CarType.Gasoline,
      gearbox: bookcarsTypes.GearboxType.Manual,
      aircon: true,
      seats: 6,
      doors: 5,
      fuelPolicy: bookcarsTypes.FuelPolicy.LikeForLike,
      mileage: 30000,
      cancellation: 7,
      amendments: 3,
      theftProtection: 10,
      collisionDamageWaiver: 13,
      fullInsurance: 21,
      additionalDriver: 22,
      range: bookcarsTypes.CarRange.Midi,
      multimedia: [bookcarsTypes.CarMultimedia.AndroidAuto],
      rating: 4,
      comingSoon: true,
    }
    let res = await request(app)
      .put('/api/update-car')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const car = res.body
    expect(car.name).toBe(payload.name)
    expect(car.supplier).toBe(payload.supplier)
    expect(car.minimumAge).toBe(payload.minimumAge)
    expect(car.locations).toStrictEqual(payload.locations)
    expect(car.dailyPrice).toBe(payload.dailyPrice)
    expect(car.discountedDailyPrice).toBe(payload.discountedDailyPrice)
    expect(car.biWeeklyPrice).toBe(payload.biWeeklyPrice)
    expect(car.discountedBiWeeklyPrice).toBe(payload.discountedBiWeeklyPrice)
    expect(car.weeklyPrice).toBe(payload.weeklyPrice)
    expect(car.discountedWeeklyPrice).toBe(payload.discountedWeeklyPrice)
    expect(car.monthlyPrice).toBe(payload.monthlyPrice)
    expect(car.discountedMonthlyPrice).toBe(payload.discountedMonthlyPrice)
    expect(car.deposit).toBe(payload.deposit)
    expect(car.available).toBe(payload.available)
    expect(car.type).toBe(payload.type)
    expect(car.gearbox).toBe(payload.gearbox)
    expect(car.aircon).toBe(payload.aircon)
    expect(car.seats).toBe(payload.seats)
    expect(car.doors).toBe(payload.doors)
    expect(car.fuelPolicy).toBe(payload.fuelPolicy)
    expect(car.mileage).toBe(payload.mileage)
    expect(car.cancellation).toBe(payload.cancellation)
    expect(car.amendments).toBe(payload.amendments)
    expect(car.theftProtection).toBe(payload.theftProtection)
    expect(car.collisionDamageWaiver).toBe(payload.collisionDamageWaiver)
    expect(car.fullInsurance).toBe(payload.fullInsurance)
    expect(car.additionalDriver).toBe(payload.additionalDriver)
    expect(car.range).toBe(payload.range)
    expect(car.multimedia).toStrictEqual(payload.multimedia)
    expect(car.rating).toBe(payload.rating)
    expect(car.comingSoon).toBe(payload.comingSoon)

    // test success (booking not found)
    payload._id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .put('/api/update-car')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test failure (no payload)
    res = await request(app)
      .put('/api/update-car')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-car-image/:id', () => {
  it('should delete a car image', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const car = await Car.findById(CAR_ID)
    const image = path.join(env.CDN_CARS, car?.image as string)
    let imageExists = await helper.exists(image)
    expect(imageExists).toBeTruthy()
    let res = await request(app)
      .post(`/api/delete-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    imageExists = await helper.exists(image)
    expect(imageExists).toBeFalsy()

    // test success (no image)
    car!.image = ''
    await car?.save()
    res = await request(app)
      .post(`/api/delete-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (image not found)
    car!.image = `${nanoid()}.jpg`
    await car?.save()
    res = await request(app)
      .post(`/api/delete-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (car not found)
    res = await request(app)
      .post(`/api/delete-car-image/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test failure (wrong car id)
    res = await request(app)
      .post('/api/delete-car-image/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/create-car-image', () => {
  it('should create a car image', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let res = await request(app)
      .post('/api/create-car-image')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE1_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    const filePath = path.join(env.CDN_TEMP_CARS, filename)
    const imageExists = await helper.exists(filePath)
    expect(imageExists).toBeTruthy()
    await fs.unlink(filePath)

    // test failure (image file not attached)
    res = await request(app)
      .post('/api/create-car-image')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/update-car-image/:id', () => {
  it('should update a car image', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let res = await request(app)
      .post(`/api/update-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE2_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    const imageExists = await helper.exists(path.join(env.CDN_CARS, filename))
    expect(imageExists).toBeTruthy()
    const car = await Car.findById(CAR_ID)
    expect(car).not.toBeNull()
    expect(car?.image).toBe(filename)

    // test success (image not found)
    car!.image = `${nanoid()}.jpg`
    await car?.save()
    res = await request(app)
      .post(`/api/update-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE2_PATH)
    expect(res.statusCode).toBe(200)
    car!.image = filename
    await car?.save()

    // test failure (image not attached)
    res = await request(app)
      .post(`/api/update-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test success (car not found)
    res = await request(app)
      .post(`/api/update-car-image/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE1_PATH)
    expect(res.statusCode).toBe(204)

    // test success (car found)
    res = await request(app)
      .post(`/api/update-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE1_PATH)
    expect(res.statusCode).toBe(200)

    // test failure (wrong car id)
    res = await request(app)
      .post('/api/update-car-image/0')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE1_PATH)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-temp-car-image/:image', () => {
  it('should delete a temporary car image', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const tempImage = path.join(env.CDN_TEMP_CARS, IMAGE1)
    if (!await helper.exists(tempImage)) {
      await fs.copyFile(IMAGE1_PATH, tempImage)
    }
    let res = await request(app)
      .post(`/api/delete-temp-car-image/${IMAGE1}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    const tempImageExists = await helper.exists(tempImage)
    expect(tempImageExists).toBeFalsy()

    // test failure (image not found)
    res = await request(app)
      .post('/api/delete-temp-car-image/unknown.jpg')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/car/:id/:language', () => {
  it('should return a car', async () => {
    // test success
    let res = await request(app)
      .get(`/api/car/${CAR_ID}/${testHelper.LANGUAGE}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.name).toBe('BMW X5')

    // test success (car not found)
    res = await request(app)
      .get(`/api/car/${testHelper.GetRandromObjectIdAsString()}/${testHelper.LANGUAGE}`)
    expect(res.statusCode).toBe(204)

    // test failure (wrong car id)
    res = await request(app)
      .get(`/api/car/0/${testHelper.LANGUAGE}`)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/cars/:page/:size', () => {
  it('should return cars', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (full filter)
    const payload: bookcarsTypes.GetCarsPayload = {
      suppliers: [SUPPLIER2_ID],
      carType: [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline],
      gearbox: [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic],
      mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
      availability: [bookcarsTypes.Availablity.Available, bookcarsTypes.Availablity.Unavailable],
      deposit: -1,
      ranges: [
        bookcarsTypes.CarRange.Mini,
        bookcarsTypes.CarRange.Midi,
        bookcarsTypes.CarRange.Maxi,
        bookcarsTypes.CarRange.Scooter,
      ],
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
      fuelPolicy: [bookcarsTypes.FuelPolicy.LikeForLike],
    }
    let res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    // test success (filter)
    payload.rating = undefined
    payload.ranges = undefined
    payload.multimedia = undefined
    payload.fuelPolicy = undefined
    payload.carSpecs!.aircon = undefined
    payload.carSpecs!.moreThanFourDoors = undefined
    payload.carSpecs!.moreThanFiveSeats = undefined
    payload.seats = -1
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)
    payload.rating = 4
    payload.ranges = [
      bookcarsTypes.CarRange.Mini,
      bookcarsTypes.CarRange.Midi,
      bookcarsTypes.CarRange.Maxi,
      bookcarsTypes.CarRange.Scooter,
    ]
    payload.multimedia = [bookcarsTypes.CarMultimedia.AndroidAuto]
    payload.fuelPolicy = [bookcarsTypes.FuelPolicy.LikeForLike]

    // test success (no seats no carSpecs)
    payload.seats = undefined
    payload.carSpecs = undefined
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)
    payload.carSpecs = {}
    payload.carSpecs!.aircon = true
    payload.carSpecs!.moreThanFourDoors = true
    payload.carSpecs!.moreThanFiveSeats = true

    // test success (seats no carSpecs)
    payload.seats = 5
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)
    payload.seats = 6

    // test success (filter)
    payload.carType = undefined
    payload.gearbox = undefined
    payload.mileage = undefined
    payload.availability = undefined
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    // test failure (no payload)
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test success (mileage)
    payload.mileage = [bookcarsTypes.Mileage.Unlimited]
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

    // test success (mileage)
    payload.mileage = [bookcarsTypes.Mileage.Limited]
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    // test success (no mileage)
    payload.mileage = []
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

    // test success (deposit)
    payload.mileage = [bookcarsTypes.Mileage.Limited]
    payload.deposit = 12000
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    // test success (availability)
    payload.availability = [bookcarsTypes.Availablity.Available]
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    // test success (availability)
    payload.availability = [bookcarsTypes.Availablity.Unavailable]
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

    // test success (no availability)
    payload.availability = []
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

    await testHelper.signout(token)
  })
})

describe('POST /api/booking-cars/:page/:size', () => {
  it('should return booking cars', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const payload: bookcarsTypes.GetBookingCarsPayload = {
      supplier: SUPPLIER2_ID,
      pickupLocation: LOCATION2_ID,
    }
    let res = await request(app)
      .post(`/api/booking-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    // test failure (wrong page)
    res = await request(app)
      .post(`/api/booking-cars/unknown/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/frontend-cars/:page/:size', () => {
  it('should return frontend cars', async () => {
    // test success (full filter)
    const payload: bookcarsTypes.GetCarsPayload = {
      suppliers: [SUPPLIER2_ID],
      pickupLocation: LOCATION2_ID,
      carType: [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline],
      gearbox: [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic],
      mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
      deposit: -1,
      ranges: [
        bookcarsTypes.CarRange.Mini,
        bookcarsTypes.CarRange.Midi,
        bookcarsTypes.CarRange.Maxi,
        bookcarsTypes.CarRange.Scooter,
      ],
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
      fuelPolicy: [bookcarsTypes.FuelPolicy.LikeForLike],
      days: 3,
    }
    let res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    payload.days = undefined
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    // test success (filter)
    payload.rating = undefined
    payload.ranges = undefined
    payload.multimedia = undefined
    payload.fuelPolicy = undefined
    payload.carSpecs!.aircon = undefined
    payload.carSpecs!.moreThanFourDoors = undefined
    payload.carSpecs!.moreThanFiveSeats = undefined
    payload.seats = -1
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)
    payload.rating = 4
    payload.ranges = [
      bookcarsTypes.CarRange.Mini,
      bookcarsTypes.CarRange.Midi,
      bookcarsTypes.CarRange.Maxi,
      bookcarsTypes.CarRange.Scooter,
    ]
    payload.multimedia = [bookcarsTypes.CarMultimedia.AndroidAuto]
    payload.fuelPolicy = [bookcarsTypes.FuelPolicy.LikeForLike]

    // test success (no seats no carSpecs)
    payload.seats = undefined
    payload.carSpecs = undefined
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)
    payload.carSpecs = {}
    payload.carSpecs.aircon = true
    payload.carSpecs.moreThanFourDoors = true
    payload.carSpecs.moreThanFiveSeats = true

    // test success (seats no carSpecs)
    payload.seats = 5
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)
    payload.seats = 6

    // test success (no mileage)
    payload.mileage = undefined
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    // test failure (no payload)
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
    expect(res.statusCode).toBe(400)

    // test success (mileage)
    payload.mileage = [bookcarsTypes.Mileage.Unlimited]
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

    // test success (mileage)
    payload.mileage = [bookcarsTypes.Mileage.Limited]
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    // test success (no mileage)
    payload.mileage = []
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

    // test success (deposit)
    payload.mileage = [bookcarsTypes.Mileage.Limited]
    payload.deposit = 12000
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)
  })
})

describe('GET /api/check-car/:id', () => {
  it('should check a car', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (car related not to a booking)
    let res = await request(app)
      .get(`/api/check-car/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test success (car related to a booking)
    const booking = new Booking({
      supplier: SUPPLIER1_ID,
      car: CAR_ID,
      driver: testHelper.getUserId(),
      pickupLocation: LOCATION1_ID,
      dropOffLocation: LOCATION1_ID,
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
    })
    await booking.save()
    res = await request(app)
      .get(`/api/check-car/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    await Booking.deleteOne({ _id: booking._id })

    // test failure (wrong car id)
    res = await request(app)
      .get('/api/check-car/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('DELETE /api/delete-car/:id', () => {
  it('should delete a car', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let res = await request(app)
      .delete(`/api/delete-car/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (no image)
    let car = new Car({
      name: 'BMW X1',
      supplier: SUPPLIER1_ID,
      minimumAge: 21,
      locations: [testHelper.GetRandromObjectId()],
      dailyPrice: 78,
      deposit: 95,
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
      .delete(`/api/delete-car/${car.id}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (image not found)
    car = new Car({
      name: 'BMW X1',
      supplier: SUPPLIER1_ID,
      minimumAge: 21,
      locations: [testHelper.GetRandromObjectId()],
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
      .delete(`/api/delete-car/${car.id}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (car not found)
    res = await request(app)
      .delete(`/api/delete-car/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test failure (wrong car id)
    res = await request(app)
      .delete('/api/delete-car/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})
