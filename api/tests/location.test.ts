import 'dotenv/config'
import request from 'supertest'
import { v1 as uuid } from 'uuid'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/common/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import LocationValue from '../src/models/LocationValue'
import Location from '../src/models/Location'
import Car from '../src/models/Car'

let LOCATION_ID: string

let LOCATION_NAMES: bookcarsTypes.LocationName[] = [
  {
    language: 'en',
    value: uuid(),
  },
  {
    language: 'fr',
    value: uuid(),
  },
]

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  const res = await databaseHelper.connect(env.DB_URI, false, false)
  expect(res).toBeTruthy()
  await testHelper.initialize()
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  if (mongoose.connection.readyState) {
    await testHelper.close()
    await databaseHelper.close()
  }
})

//
// Unit tests
//

describe('POST /api/validate-location', () => {
  it('should validate a location', async () => {
    const token = await testHelper.signinAsAdmin()

    const language = testHelper.LANGUAGE
    const name = uuid()
    const locationValue = new LocationValue({ language, value: name })
    await locationValue.save()
    const payload: bookcarsTypes.ValidateLocationPayload = {
      language,
      name,
    }
    let res = await request(app)
      .post('/api/validate-location')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload.name = uuid()
    res = await request(app)
      .post('/api/validate-location')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    await LocationValue.deleteOne({ _id: locationValue._id })

    res = await request(app)
      .post('/api/validate-location')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/create-location', () => {
  it('should create a location', async () => {
    const token = await testHelper.signinAsAdmin()

    const payload: bookcarsTypes.UpsertLocationPayload = {
      country: testHelper.GetRandromObjectIdAsString(),
      names: LOCATION_NAMES,
      latitude: 28.0268755,
      longitude: 1.6528399999999976,
    }

    let res = await request(app)
      .post('/api/create-location')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body?.country).toBe(payload.country)
    expect(res.body?.values?.length).toBe(2)
    expect(res.body?.latitude).toBe(payload.latitude)
    expect(res.body?.longitude).toBe(payload.longitude)
    LOCATION_ID = res.body?._id

    res = await request(app)
      .post('/api/create-location')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('PUT /api/update-location/:id', () => {
  it('should update a location', async () => {
    const token = await testHelper.signinAsAdmin()

    LOCATION_NAMES = [
      {
        language: 'en',
        value: uuid(),
      },
      {
        language: 'fr',
        value: uuid(),
      },
      {
        language: 'es',
        value: uuid(),
      },
    ]

    const payload: bookcarsTypes.UpsertLocationPayload = {
      country: testHelper.GetRandromObjectIdAsString(),
      names: LOCATION_NAMES,
      latitude: 29.0268755,
      longitude: 2.6528399999999976,
    }

    let res = await request(app)
      .put(`/api/update-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body?.country).toBe(payload.country)
    expect(res.body.values?.length).toBe(3)
    expect(res.body?.latitude).toBe(payload.latitude)
    expect(res.body?.longitude).toBe(payload.longitude)

    res = await request(app)
      .put(`/api/update-location/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .put(`/api/update-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/location/:id/:language', () => {
  it('should get a location', async () => {
    const language = 'en'

    let res = await request(app)
      .get(`/api/location/${LOCATION_ID}/${language}`)
    expect(res.statusCode).toBe(200)
    expect(res.body?.name).toBe(LOCATION_NAMES.filter((v) => v.language === language)[0].value)

    res = await request(app)
      .get(`/api/location/${testHelper.GetRandromObjectIdAsString()}/${language}`)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get(`/api/location/${LOCATION_ID}/zh`)
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/locations/:page/:size/:language', () => {
  it('should get locations', async () => {
    const language = 'en'

    let res = await request(app)
      .get(`/api/locations/${testHelper.PAGE}/${testHelper.SIZE}/${language}?s=${LOCATION_NAMES[0].value}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)

    res = await request(app)
      .get(`/api/locations/unknown/${testHelper.SIZE}/${language}`)
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/check-location/:id', () => {
  it('should check a location', async () => {
    const token = await testHelper.signinAsAdmin()

    const supplierName = testHelper.getSupplierName()
    const supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    const car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [LOCATION_ID],
      price: 780,
      deposit: 9500,
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
      theftProtection: 90,
      collisionDamageWaiver: 120,
      fullInsurance: 200,
      additionalDriver: 200,
      range: bookcarsTypes.CarRange.Midi,
    })
    await car.save()
    let res = await request(app)
      .get(`/api/check-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    await Car.deleteOne({ _id: car._id })
    await testHelper.deleteSupplier(supplierId)
    res = await request(app)
      .get(`/api/check-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get(`/api/check-location/${uuid()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('DELETE /api/delete-location/:id', () => {
  it('should delete a location', async () => {
    const token = await testHelper.signinAsAdmin()

    let location = await Location.findById(LOCATION_ID)
    expect(location).not.toBeNull()
    let res = await request(app)
      .delete(`/api/delete-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    location = await Location.findById(LOCATION_ID)
    expect(location).toBeNull()

    res = await request(app)
      .delete(`/api/delete-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .delete('/api/delete-location/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})
