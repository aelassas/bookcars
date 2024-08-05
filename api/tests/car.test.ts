import 'dotenv/config'
import request from 'supertest'
import url from 'url'
import path from 'path'
import fs from 'node:fs/promises'
import { v1 as uuid } from 'uuid'
import mongoose from 'mongoose'
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
const IMAGE1_PATH = path.resolve(__dirname, `./img/${IMAGE1}`)
const IMAGE2 = 'bmw-x5.jpg'
const IMAGE2_PATH = path.resolve(__dirname, `./img/${IMAGE2}`)

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
  if (mongoose.connection.readyState) {
    await testHelper.close()

    // delete suppliers
    await testHelper.deleteSupplier(SUPPLIER1_ID)
    await testHelper.deleteSupplier(SUPPLIER2_ID)

    // delete locations
    await testHelper.deleteLocation(LOCATION1_ID)
    await testHelper.deleteLocation(LOCATION2_ID)

    await databaseHelper.close()
  }
})

//
// Unit tests
//

describe('POST /api/create-car', () => {
  it('should create a car', async () => {
    const token = await testHelper.signinAsAdmin()

    const tempImage = path.join(env.CDN_TEMP_CARS, IMAGE1)
    if (!await helper.exists(tempImage)) {
      fs.copyFile(IMAGE1_PATH, tempImage)
    }
    const payload: bookcarsTypes.CreateCarPayload = {
      name: 'BMW X1',
      supplier: SUPPLIER1_ID,
      minimumAge: 21,
      locations: [LOCATION1_ID],
      price: 780,
      deposit: 9500,
      available: false,
      type: bookcarsTypes.CarType.Diesel,
      gearbox: bookcarsTypes.GearboxType.Automatic,
      aircon: true,
      image: IMAGE1,
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
      range: bookcarsTypes.CarRange.Mini,
      multimedia: [bookcarsTypes.CarMultimedia.Bluetooth],
      rating: 3,
    }
    let res = await request(app)
      .post('/api/create-car')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    CAR_ID = res.body._id

    payload.image = undefined
    res = await request(app)
      .post('/api/create-car')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    payload.image = 'unknown.jpg'
    res = await request(app)
      .post('/api/create-car')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    res = await request(app)
      .post('/api/create-car')
      .set(env.X_ACCESS_TOKEN, token)
      .send({ image: 'image.jpg' })
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('PUT /api/update-car', () => {
  it('should update a car', async () => {
    const token = await testHelper.signinAsAdmin()

    const payload: bookcarsTypes.UpdateCarPayload = {
      _id: CAR_ID,
      name: 'BMW X5',
      supplier: SUPPLIER2_ID,
      minimumAge: 23,
      locations: [LOCATION2_ID],
      price: 980,
      deposit: 10500,
      available: true,
      type: bookcarsTypes.CarType.Gasoline,
      gearbox: bookcarsTypes.GearboxType.Manual,
      aircon: false,
      seats: 4,
      doors: 5,
      fuelPolicy: bookcarsTypes.FuelPolicy.LikeForlike,
      mileage: 30000,
      cancellation: 70,
      amendments: 30,
      theftProtection: 100,
      collisionDamageWaiver: 130,
      fullInsurance: 210,
      additionalDriver: 220,
      range: bookcarsTypes.CarRange.Midi,
      multimedia: [bookcarsTypes.CarMultimedia.AndroidAuto],
      rating: 4,
    }
    let res = await request(app)
      .put('/api/update-car')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    const car = res.body
    expect(car.name).toBe('BMW X5')
    expect(car.supplier).toBe(SUPPLIER2_ID)
    expect(car.minimumAge).toBe(23)
    expect(car.locations).toStrictEqual([LOCATION2_ID])
    expect(car.price).toBe(980)
    expect(car.deposit).toBe(10500)
    expect(car.available).toBeTruthy()
    expect(car.type).toBe(bookcarsTypes.CarType.Gasoline)
    expect(car.gearbox).toBe(bookcarsTypes.GearboxType.Manual)
    expect(car.aircon).toBe(false)
    expect(car.seats).toBe(4)
    expect(car.doors).toBe(5)
    expect(car.fuelPolicy).toBe(bookcarsTypes.FuelPolicy.LikeForlike)
    expect(car.mileage).toBe(30000)
    expect(car.cancellation).toBe(70)
    expect(car.amendments).toBe(30)
    expect(car.theftProtection).toBe(100)
    expect(car.collisionDamageWaiver).toBe(130)
    expect(car.fullInsurance).toBe(210)
    expect(car.additionalDriver).toBe(220)
    expect(car.range).toBe(bookcarsTypes.CarRange.Midi)
    expect(car.multimedia).toStrictEqual([bookcarsTypes.CarMultimedia.AndroidAuto])
    expect(car.rating).toBe(4)

    payload._id = testHelper.GetRandromObjectIdAsString()
    res = await request(app)
      .put('/api/update-car')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

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

    car!.image = ''
    await car?.save()
    res = await request(app)
      .post(`/api/delete-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    car!.image = `${uuid()}.jpg`
    await car?.save()
    res = await request(app)
      .post(`/api/delete-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    res = await request(app)
      .post(`/api/delete-car-image/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

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

    let res = await request(app)
      .post('/api/create-car-image')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE1_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    const filePath = path.resolve(env.CDN_TEMP_CARS, filename)
    const imageExists = await helper.exists(filePath)
    expect(imageExists).toBeTruthy()
    await fs.unlink(filePath)

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

    let res = await request(app)
      .post(`/api/update-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE2_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    const imageExists = await helper.exists(path.resolve(env.CDN_CARS, filename))
    expect(imageExists).toBeTruthy()
    const car = await Car.findById(CAR_ID)
    expect(car).not.toBeNull()
    expect(car?.image).toBe(filename)

    car!.image = `${uuid()}.jpg`
    await car?.save()
    res = await request(app)
      .post(`/api/update-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE2_PATH)
    expect(res.statusCode).toBe(200)
    car!.image = filename
    await car?.save()

    res = await request(app)
      .post(`/api/update-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    res = await request(app)
      .post(`/api/update-car-image/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE1_PATH)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .post(`/api/update-car-image/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE1_PATH)
    expect(res.statusCode).toBe(200)

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

    const tempImage = path.join(env.CDN_TEMP_CARS, IMAGE1)
    if (!await helper.exists(tempImage)) {
      fs.copyFile(IMAGE1_PATH, tempImage)
    }
    let res = await request(app)
      .post(`/api/delete-temp-car-image/${IMAGE1}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    const tempImageExists = await helper.exists(tempImage)
    expect(tempImageExists).toBeFalsy()

    res = await request(app)
      .post('/api/delete-temp-car-image/unknown.jpg')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/car/:id/:language', () => {
  it('should return a car', async () => {
    let res = await request(app)
      .get(`/api/car/${CAR_ID}/${testHelper.LANGUAGE}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.name).toBe('BMW X5')

    res = await request(app)
      .get(`/api/car/${testHelper.GetRandromObjectIdAsString()}/${testHelper.LANGUAGE}`)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get(`/api/car/0/${testHelper.LANGUAGE}`)
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/cars/:page/:size', () => {
  it('should return cars', async () => {
    const token = await testHelper.signinAsAdmin()

    const payload: bookcarsTypes.GetCarsPayload = {
      suppliers: [SUPPLIER2_ID],
      carType: [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline],
      gearbox: [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic],
      mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
      availability: [bookcarsTypes.Availablity.Available, bookcarsTypes.Availablity.Unavailable],
      deposit: -1,
    }

    let res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

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

    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    payload.mileage = [bookcarsTypes.Mileage.Unlimited]
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

    payload.mileage = [bookcarsTypes.Mileage.Limited]
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    payload.mileage = []
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

    payload.mileage = [bookcarsTypes.Mileage.Limited]
    payload.deposit = 12000
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    payload.availability = [bookcarsTypes.Availablity.Available]
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    payload.availability = [bookcarsTypes.Availablity.Unavailable]
    res = await request(app)
      .post(`/api/cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

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
    const payload: bookcarsTypes.GetCarsPayload = {
      suppliers: [SUPPLIER2_ID],
      pickupLocation: LOCATION2_ID,
      carType: [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline],
      carSpecs: {},
      fuelPolicy: [bookcarsTypes.FuelPolicy.FreeTank, bookcarsTypes.FuelPolicy.LikeForlike],
      gearbox: [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic],
      mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
      deposit: -1,
    }
    let res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    payload.mileage = undefined
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
    expect(res.statusCode).toBe(400)

    payload.mileage = [bookcarsTypes.Mileage.Unlimited]
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

    payload.mileage = [bookcarsTypes.Mileage.Limited]
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBeGreaterThan(0)

    payload.mileage = []
    res = await request(app)
      .post(`/api/frontend-cars/${testHelper.PAGE}/${testHelper.SIZE}`)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body[0].resultData.length).toBe(0)

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

    let res = await request(app)
      .get(`/api/check-car/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

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

    res = await request(app)
      .get('/api/check-car/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

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

    let res = await request(app)
      .delete(`/api/delete-car/${CAR_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    let car = new Car({
      name: 'BMW X1',
      supplier: SUPPLIER1_ID,
      minimumAge: 21,
      locations: [testHelper.GetRandromObjectId()],
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
      .delete(`/api/delete-car/${car.id}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    car = new Car({
      name: 'BMW X1',
      supplier: SUPPLIER1_ID,
      minimumAge: 21,
      locations: [testHelper.GetRandromObjectId()],
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
      .delete(`/api/delete-car/${car.id}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    res = await request(app)
      .delete(`/api/delete-car/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .delete('/api/delete-car/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    res = await request(app)
      .delete('/api/delete-car/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})
