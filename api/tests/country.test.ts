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
import Country from '../src/models/Country'
import Location from '../src/models/Location'

let COUNTRY_ID: string

let COUNTRY_NAMES: bookcarsTypes.CountryName[] = [
  {
    language: 'en',
    name: uuid(),
  },
  {
    language: 'fr',
    name: uuid(),
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

describe('POST /api/validate-country', () => {
  it('should validate a country', async () => {
    const token = await testHelper.signinAsAdmin()

    const language = testHelper.LANGUAGE
    const name = uuid()
    const countryValue = new LocationValue({ language, value: name })
    await countryValue.save()
    const payload: bookcarsTypes.ValidateCountryPayload = {
      language,
      name,
    }
    let res = await request(app)
      .post('/api/validate-country')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    payload.name = uuid()
    res = await request(app)
      .post('/api/validate-country')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    await LocationValue.deleteOne({ _id: countryValue._id })

    res = await request(app)
      .post('/api/validate-country')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/create-country', () => {
  it('should create a country', async () => {
    const token = await testHelper.signinAsAdmin()

    let res = await request(app)
      .post('/api/create-country')
      .set(env.X_ACCESS_TOKEN, token)
      .send(COUNTRY_NAMES)
    expect(res.statusCode).toBe(200)
    expect(res.body?.values?.length).toBe(2)
    COUNTRY_ID = res.body?._id

    res = await request(app)
      .post('/api/create-country')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('PUT /api/update-country/:id', () => {
  it('should update a country', async () => {
    const token = await testHelper.signinAsAdmin()

    COUNTRY_NAMES = [
      {
        language: 'en',
        name: uuid(),
      },
      {
        language: 'fr',
        name: uuid(),
      },
      {
        language: 'es',
        name: uuid(),
      },
    ]

    let res = await request(app)
      .put(`/api/update-country/${COUNTRY_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(COUNTRY_NAMES)
    expect(res.statusCode).toBe(200)
    expect(res.body.values?.length).toBe(3)

    res = await request(app)
      .put(`/api/update-country/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(COUNTRY_NAMES)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .put(`/api/update-country/${COUNTRY_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/country/:id/:language', () => {
  it('should get a country', async () => {
    const token = await testHelper.signinAsAdmin()
    const language = 'en'

    let res = await request(app)
      .get(`/api/country/${COUNTRY_ID}/${language}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body?.name).toBe(COUNTRY_NAMES.filter((v) => v.language === language)[0].name)

    res = await request(app)
      .get(`/api/country/${testHelper.GetRandromObjectIdAsString()}/${language}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get(`/api/country/${COUNTRY_ID}/zh`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/countries/:page/:size/:language', () => {
  it('should get countries', async () => {
    const token = await testHelper.signinAsAdmin()
    const language = 'en'

    let res = await request(app)
      .get(`/api/countries/${testHelper.PAGE}/${testHelper.SIZE}/${language}?s=${COUNTRY_NAMES[0].name}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)

    res = await request(app)
      .get(`/api/countries/unknown/${testHelper.SIZE}/${language}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/check-country/:id', () => {
  it('should check a country', async () => {
    const token = await testHelper.signinAsAdmin()

    const locationId = await testHelper.createLocation('test-en', 'test-fr', COUNTRY_ID)

    let res = await request(app)
      .get(`/api/check-country/${COUNTRY_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    const location = await Location.findById(locationId)
    await LocationValue.deleteMany({ _id: { $in: location?.values } })
    await Location.deleteOne({ _id: locationId })
    res = await request(app)
      .get(`/api/check-country/${COUNTRY_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get(`/api/check-country/${uuid()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/countries-with-locations/:language/:imageRequired/:minLocations', () => {
  it('should get a countries with location', async () => {
    const language = 'en'

    const locationValueEn = new LocationValue({ language, value: 'Location 1 en' })
    await locationValueEn.save()
    const locationValueFr = new LocationValue({ language: 'fr', value: 'Location 1 fr' })
    await locationValueFr.save()

    const location = new Location({ country: COUNTRY_ID, values: [locationValueEn.id, locationValueFr.id] })
    await location.save()

    let res = await request(app)
      .get(`/api/countries-with-locations/${language}/false/1`)
    expect(res.statusCode).toBe(200)
    expect(res.body.find((country: bookcarsTypes.Country) => country._id === COUNTRY_ID)).toBeDefined()

    res = await request(app)
      .get(`/api/countries-with-locations/${language}/true/1`)
    expect(res.statusCode).toBe(200)
    expect(res.body.find((country: bookcarsTypes.Country) => country._id === COUNTRY_ID)).toBeUndefined()

    await locationValueEn.deleteOne()
    await locationValueFr.deleteOne()
    await location.deleteOne()

    res = await request(app)
      .get(`/api/countries-with-locations/${language}/false/1`)
    expect(res.statusCode).toBe(200)
    expect(res.body.find((country: bookcarsTypes.Country) => country._id === COUNTRY_ID)).toBeUndefined()

    // test failure
    await databaseHelper.close()
    res = await request(app)
      .get(`/api/countries-with-locations/${language}/false/1`)
    expect(res.statusCode).toBe(400)
    const connRes = await databaseHelper.connect(env.DB_URI, false, false)
    expect(connRes).toBeTruthy()
  })
})

describe('GET /api/country-id/:name/:language', () => {
  it('should get a country id', async () => {
    const token = await testHelper.signinAsAdmin()
    const language = 'en'

    let res = await request(app)
      .get(`/api/country-id/${COUNTRY_NAMES.find((n) => n.language === language)?.name}/${language}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe(COUNTRY_ID)

    res = await request(app)
      .get(`/api/country-id/unknown/${language}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .get('/api/country-id/unknown/english')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('DELETE /api/delete-country/:id', () => {
  it('should delete a country', async () => {
    const token = await testHelper.signinAsAdmin()

    let country = await Country.findById(COUNTRY_ID)
    expect(country).not.toBeNull()
    let res = await request(app)
      .delete(`/api/delete-country/${COUNTRY_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    country = await Country.findById(COUNTRY_ID)
    expect(country).toBeNull()

    res = await request(app)
      .delete(`/api/delete-country/${COUNTRY_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    res = await request(app)
      .delete('/api/delete-country/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})
