import 'dotenv/config'
import request from 'supertest'
import url from 'url'
import path from 'path'
import asyncFs from 'node:fs/promises'
import { nanoid } from 'nanoid'
import mongoose, { FlattenMaps } from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import app from '../src/app'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import * as helper from '../src/utils/helper'
import LocationValue from '../src/models/LocationValue'
import Location from '../src/models/Location'
import Country from '../src/models/Country'
import Car from '../src/models/Car'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IMAGE0 = 'location0.jpg'
const IMAGE0_PATH = path.join(__dirname, `./img/${IMAGE0}`)
const IMAGE1 = 'location1.jpg'
const IMAGE1_PATH = path.join(__dirname, `./img/${IMAGE1}`)
const IMAGE2 = 'location2.jpg'
const IMAGE2_PATH = path.join(__dirname, `./img/${IMAGE2}`)

let SUPPLIER_ID: string
let LOCATION_ID: string
let PARENT_LOCATION_ID: string

let LOCATION_NAMES: bookcarsTypes.LocationName[] = [
  {
    language: 'en',
    name: nanoid(),
  },
  {
    language: 'fr',
    name: nanoid(),
  },
]

let countryValue1Id = ''
let countryValue2Id = ''
let countryId = ''

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  await databaseHelper.connect(env.DB_URI, false, false)
  await testHelper.initialize()

  const supplierName = nanoid()
  SUPPLIER_ID = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
  const countryValue1 = new LocationValue({ language: 'en', value: 'Country 1' })
  await countryValue1.save()
  countryValue1Id = countryValue1._id.toString()
  const countryValue2 = new LocationValue({ language: 'fr', value: 'Pays 1' })
  await countryValue2.save()
  countryValue2Id = countryValue2._id.toString()
  const country = new Country({ values: [countryValue1._id, countryValue2._id] })
  await country.save()
  countryId = country._id.toString()
  PARENT_LOCATION_ID = await testHelper.createLocation('parent-loc-name', 'parent-loc-fr', countryId)
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  await testHelper.deleteSupplier(SUPPLIER_ID)
  await LocationValue.deleteMany({ _id: { $in: [countryValue1Id, countryValue2Id] } })
  await Country.deleteOne({ _id: countryId })
  await testHelper.deleteLocation(PARENT_LOCATION_ID)

  await testHelper.close()
  await databaseHelper.close()
})

//
// Unit tests
//

describe('POST /api/validate-location', () => {
  it('should validate a location', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (location found)
    const language = testHelper.LANGUAGE
    const name = nanoid()
    const locationValue = new LocationValue({ language, value: name })
    await locationValue.save()
    const location = new Location({ country: countryId, values: [locationValue._id] })
    await location.save()
    const payload: bookcarsTypes.ValidateLocationPayload = {
      language,
      name,
    }
    let res = await request(app)
      .post('/api/validate-location')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test success (location not found)
    payload.name = nanoid()
    res = await request(app)
      .post('/api/validate-location')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    await locationValue.deleteOne()
    await location.deleteOne()

    // test failure (wrong language)
    payload.language = 'unknown'
    res = await request(app)
      .post('/api/validate-location')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test failure (no payload)
    res = await request(app)
      .post('/api/validate-location')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(500)

    await testHelper.signout(token)
  })
})

describe('POST /api/create-location', () => {
  it('should create a location', async () => {
    const token = await testHelper.signinAsAdmin()

    // test failure (image not found)
    const payload: bookcarsTypes.UpsertLocationPayload = {
      country: countryId,
      names: LOCATION_NAMES,
      latitude: 28.0268755,
      longitude: 1.6528399999999976,
      image: `${nanoid()}.jpg`,
      supplier: SUPPLIER_ID,
    }
    let res = await request(app)
      .post('/api/create-location')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)

    // test success (no image)
    payload.image = undefined
    res = await request(app)
      .post('/api/create-location')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body._id).toBeTruthy()
    const location = await Location.findByIdAndDelete(res.body._id)
    expect(location).toBeTruthy()
    expect((await LocationValue.find({ _id: { $in: location!.values } })).length).toBe(2)
    await LocationValue.deleteMany({ _id: { $in: location!.values } })

    // test success (image and parkingspots)
    payload.parkingSpots = [
      {
        latitude: 28.1268755,
        longitude: 1.752839999999997,
        values: [{ language: 'en', value: 'Parking spot 1' }, { language: 'fr', value: 'Parking 1' }, { language: 'es', value: 'Parking 1' }],
      },
      {
        latitude: 28.2268755,
        longitude: 1.8528399999999976,
        values: [{ language: 'en', value: 'Parking spot 2' }, { language: 'fr', value: 'Parking 2' }, { language: 'es', value: 'Parking 1' }],
      },
      {
        latitude: 27.2268755,
        longitude: 12.852839999999997,
      },
    ]
    const tempImage = path.join(env.CDN_TEMP_LOCATIONS, IMAGE0)
    if (!(await helper.pathExists(tempImage))) {
      await asyncFs.copyFile(IMAGE0_PATH, tempImage)
    }
    payload.image = IMAGE0
    res = await request(app)
      .post('/api/create-location')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body?.country).toBe(payload.country)
    expect(res.body?.values?.length).toBe(2)
    expect(res.body?.latitude).toBe(payload.latitude)
    expect(res.body?.longitude).toBe(payload.longitude)
    expect(res.body?.parkingSpots?.length).toBe(3)
    LOCATION_ID = res.body?._id

    // test failure (wrong payload)
    res = await request(app)
      .post('/api/create-location')
      .set(env.X_ACCESS_TOKEN, token)
      .send({})
    expect(res.statusCode).toBe(400)

    // test failure (no payload)
    res = await request(app)
      .post('/api/create-location')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(500)

    await testHelper.signout(token)
  })
})

describe('PUT /api/update-location/:id', () => {
  it('should update a location', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    LOCATION_NAMES = [
      {
        language: 'en',
        name: 'test-en',
      },
      {
        language: 'fr',
        name: nanoid(),
      },
      {
        language: 'es',
        name: nanoid(),
      },
    ]
    const location = await Location
      .findById(LOCATION_ID)
      .populate<{ parkingSpots: env.ParkingSpot[] }>({
        path: 'parkingSpots',
        populate: {
          path: 'values',
          model: 'LocationValue',
        },
      })
      .lean()
    expect(location?.parkingSpots.length).toBe(3)

    const parkingSpot2 = (location!.parkingSpots[1]) as unknown as FlattenMaps<bookcarsTypes.ParkingSpot>
    expect(parkingSpot2.values!.length).toBe(3)
    parkingSpot2.values![0].value = 'Parking spot 2 updated'
    parkingSpot2.values![3] = { language: 'pt', value: 'Parking spot 2 pt' }

    const payload: bookcarsTypes.UpsertLocationPayload = {
      country: countryId,
      names: LOCATION_NAMES,
      latitude: 29.0268755,
      longitude: 2.6528399999999976,
      parkingSpots: [
        parkingSpot2,
        {
          latitude: 28.1268755,
          longitude: 1.752839999999997,
          values: [{ language: 'en', value: 'Parking spot 3' }, { language: 'fr', value: 'Parking 3' }, { language: 'es', value: 'Parking 3' }],
        },
        {
          latitude: 28.2268755,
          longitude: 1.8528399999999976,
          values: [{ language: 'en', value: 'Parking spot 4' }, { language: 'fr', value: 'Parking 4' }, { language: 'es', value: 'Parking 3' }],
        },
      ],
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
    expect(res.body?.parkingSpots.length).toBe(3)

    // test success (no parkingSpots)
    payload.parkingSpots = undefined
    payload.parentLocation = PARENT_LOCATION_ID
    res = await request(app)
      .put(`/api/update-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body?.country).toBe(payload.country)
    expect(res.body.values?.length).toBe(3)
    expect(res.body?.latitude).toBe(payload.latitude)
    expect(res.body?.longitude).toBe(payload.longitude)
    expect(res.body?.parkingSpots.length).toBe(0)

    // test success (update parkingSpots)
    payload.parentLocation = undefined
    const loc = await Location.findById(LOCATION_ID)
    loc!.parkingSpots = null
    await loc!.save()
    payload.parkingSpots = [
      {
        latitude: 28.1268755,
        longitude: 1.752839999999997,
        values: [{ language: 'en', value: 'Parking spot 1' }, { language: 'fr', value: 'Parking 1' }, { language: 'es', value: 'Parking 1' }],
      },
    ]
    res = await request(app)
      .put(`/api/update-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body?.country).toBe(payload.country)
    expect(res.body.values?.length).toBe(3)
    expect(res.body?.latitude).toBe(payload.latitude)
    expect(res.body?.longitude).toBe(payload.longitude)
    expect(res.body?.parkingSpots.length).toBe(1)

    // test success (location not found)
    res = await request(app)
      .put(`/api/update-location/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    // test failure (no payload)
    res = await request(app)
      .put(`/api/update-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/location-id/:name/:language', () => {
  it('should get a location id', async () => {
    const language = 'en'
    const name = 'test-en'

    // test success (location found)
    let res = await request(app)
      .get(`/api/location-id/${name}/${language}`)
    expect(res.statusCode).toBe(200)
    expect(res.body).toBeDefined()

    // test success (location not found)
    res = await request(app)
      .get(`/api/location-id/unknown/${language}`)
    expect(res.statusCode).toBe(204)

    // test failure (wrong language)
    res = await request(app)
      .get('/api/location-id/unknown/english')
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/create-location-image', () => {
  it('should create a location image', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let res = await request(app)
      .post('/api/create-location-image')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE1_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    const filePath = path.join(env.CDN_TEMP_LOCATIONS, filename)
    const imageExists = await helper.pathExists(filePath)
    expect(imageExists).toBeTruthy()
    await asyncFs.unlink(filePath)

    // test failure (no image attached)
    res = await request(app)
      .post('/api/create-location-image')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/update-location-image/:id', () => {
  it('should update a location image', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let res = await request(app)
      .post(`/api/update-location-image/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE2_PATH)
    expect(res.statusCode).toBe(200)
    const filename = res.body as string
    const imageFile = path.join(env.CDN_LOCATIONS, filename)
    const imageExists = await helper.pathExists(imageFile)
    expect(imageExists).toBeTruthy()
    const location = await Location.findById(LOCATION_ID)
    expect(location).not.toBeNull()
    expect(location?.image).toBe(filename)

    // test success (no initial image)
    await asyncFs.unlink(imageFile)
    location!.image = undefined
    await location?.save()
    res = await request(app)
      .post(`/api/update-location-image/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE2_PATH)
    expect(res.statusCode).toBe(200)

    // test success (initial image not found)
    location!.image = `${nanoid()}.jpg`
    await location?.save()
    res = await request(app)
      .post(`/api/update-location-image/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE2_PATH)
    expect(res.statusCode).toBe(200)
    location!.image = filename
    await location?.save()

    // test failure (no image attached)
    res = await request(app)
      .post(`/api/update-location-image/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    // test success (location not found)
    res = await request(app)
      .post(`/api/update-location-image/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE1_PATH)
    expect(res.statusCode).toBe(204)

    // test success (location found)
    res = await request(app)
      .post(`/api/update-location-image/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE1_PATH)
    expect(res.statusCode).toBe(200)

    // test failure (wrong location id)
    res = await request(app)
      .post('/api/update-location-image/0')
      .set(env.X_ACCESS_TOKEN, token)
      .attach('image', IMAGE1_PATH)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-location-image/:id', () => {
  it('should delete a location image', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let location = await Location.findById(LOCATION_ID)
    expect(location).not.toBeNull()
    expect(location?.image).toBeDefined()
    const filename = location?.image as string
    let imageExists = await helper.pathExists(path.join(env.CDN_LOCATIONS, filename))
    expect(imageExists).toBeTruthy()
    let res = await request(app)
      .post(`/api/delete-location-image/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    imageExists = await helper.pathExists(path.join(env.CDN_LOCATIONS, filename))
    expect(imageExists).toBeFalsy()
    location = await Location.findById(LOCATION_ID)
    expect(location?.image).toBeNull()

    // test success (no image)
    res = await request(app)
      .post(`/api/delete-location-image/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (image not found)
    location = await Location.findById(LOCATION_ID)
    location!.image = `${nanoid()}.jpg`
    await location!.save()
    res = await request(app)
      .post(`/api/delete-location-image/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (location not found)
    res = await request(app)
      .post(`/api/delete-location-image/${testHelper.GetRandromObjectIdAsString()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test failure (wrong location id)
    res = await request(app)
      .post('/api/delete-location-image/invalid-id')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('POST /api/delete-temp-location-image/:image', () => {
  it('should delete a temporary location image', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    const tempImage = path.join(env.CDN_TEMP_LOCATIONS, IMAGE1)
    if (!(await helper.pathExists(tempImage))) {
      await asyncFs.copyFile(IMAGE1_PATH, tempImage)
    }
    let res = await request(app)
      .post(`/api/delete-temp-location-image/${IMAGE1}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    const tempImageExists = await helper.pathExists(tempImage)
    expect(tempImageExists).toBeFalsy()

    // test success (image not found)
    res = await request(app)
      .post('/api/delete-temp-location-image/unknown.jpg')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (wrong image filename)
    // res = await request(app)
    //   .post('/api/delete-temp-location-image/unknown')
    //   .set(env.X_ACCESS_TOKEN, token)
    // expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('GET /api/location/:id/:language', () => {
  it('should get a location', async () => {
    const language = 'en'

    // test success (LOCATION_ID)
    let res = await request(app)
      .get(`/api/location/${LOCATION_ID}/${language}`)
    expect(res.statusCode).toBe(200)
    expect(res.body?.name).toBe(LOCATION_NAMES.filter((v) => v.language === language)[0].name)

    // test success (parent location)
    const loc = await Location.findById(LOCATION_ID)
    loc!.parentLocation = new mongoose.Types.ObjectId(PARENT_LOCATION_ID)
    await loc!.save()
    res = await request(app)
      .get(`/api/location/${LOCATION_ID}/${language}`)
    expect(res.statusCode).toBe(200)
    expect(res.body?.name).toBe(LOCATION_NAMES.filter((v) => v.language === language)[0].name)
    loc!.parentLocation = undefined
    await loc!.save()

    // test success (new location)
    const locationId = await testHelper.createLocation('loc1-en', 'loc1-fr')
    res = await request(app)
      .get(`/api/location/${locationId}/${language}`)
    expect(res.statusCode).toBe(200)
    expect(res.body?.name).toBe('loc1-en')
    const location = await Location.findByIdAndDelete(locationId)
    expect(location).toBeTruthy()
    await LocationValue.deleteMany({ _id: { $in: location!.values } })

    // test success (location not found)
    res = await request(app)
      .get(`/api/location/${testHelper.GetRandromObjectIdAsString()}/${language}`)
    expect(res.statusCode).toBe(204)

    // test failure (language not found)
    res = await request(app)
      .get(`/api/location/${LOCATION_ID}/zh`)
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/locations/:page/:size/:language', () => {
  it('should get locations', async () => {
    const language = 'en'

    // test success
    let res = await request(app)
      .get(`/api/locations/${testHelper.PAGE}/${testHelper.SIZE}/${language}?s=${LOCATION_NAMES[0].name}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(1)

    // test failure (wrong page number)
    res = await request(app)
      .get(`/api/locations/unknown/${testHelper.SIZE}/${language}`)
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/locations-with-position/:language', () => {
  it('should get locations with position', async () => {
    const language = 'en'

    // test success (expect result)
    let res = await request(app)
      .get(`/api/locations-with-position/${language}`)
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBeGreaterThanOrEqual(1)

    // test success (expect no result)
    res = await request(app)
      .get('/api/locations-with-position/pt')
    expect(res.statusCode).toBe(200)
    expect(res.body.length).toBe(0)

    // test failure (wrong language)
    res = await request(app)
      .get('/api/locations-with-position/english')
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/check-location/:id', () => {
  it('should check a location', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (location related to a car)
    const supplierName = testHelper.getSupplierName()
    const supplierId = await testHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)
    const car = new Car({
      name: 'BMW X1',
      supplier: supplierId,
      minimumAge: 21,
      locations: [LOCATION_ID],
      dailyPrice: 78,
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
      additionalDriver: 20,
      range: bookcarsTypes.CarRange.Midi,
    })
    await car.save()
    let res = await request(app)
      .get(`/api/check-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (location not related to a car)
    await Car.deleteOne({ _id: car._id })
    await testHelper.deleteSupplier(supplierId)
    res = await request(app)
      .get(`/api/check-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test success (location related to a child location)
    const childLocation = new Location({
      country: countryId,
      parentLocation: LOCATION_ID,
      values: [testHelper.GetRandromObjectIdAsString(), testHelper.GetRandromObjectIdAsString()]
    })
    await childLocation.save()
    res = await request(app)
      .get(`/api/check-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    await childLocation.deleteOne()

    // test failure (wrong location id)
    res = await request(app)
      .get(`/api/check-location/${nanoid()}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})

describe('DELETE /api/delete-location/:id', () => {
  it('should delete a location', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success (LOCATION_ID)
    let location = await Location.findById(LOCATION_ID)
    expect(location).not.toBeNull()

    if (!location?.image) {
      const image = path.join(env.CDN_LOCATIONS, IMAGE0)
      if (!(await helper.pathExists(image))) {
        await asyncFs.copyFile(IMAGE0_PATH, image)
      }
      location!.image = IMAGE0
      await location!.save()
    }
    let res = await request(app)
      .delete(`/api/delete-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    location = await Location.findById(LOCATION_ID)
    expect(location).toBeNull()

    // test success (new location)
    let locationId = await testHelper.createLocation('loc1-en', 'loc1-fr')
    res = await request(app)
      .delete(`/api/delete-location/${locationId}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (image not found)
    locationId = await testHelper.createLocation('loc2-en', 'loc2-fr')
    location = await Location.findById(locationId)
    location!.image = `${nanoid()}.jpg`
    await location!.save()
    res = await request(app)
      .delete(`/api/delete-location/${locationId}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)

    // test success (location not found)
    res = await request(app)
      .delete(`/api/delete-location/${LOCATION_ID}`)
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(204)

    // test failure (wrong location id)
    res = await request(app)
      .delete('/api/delete-location/0')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)

    await testHelper.signout(token)
  })
})
