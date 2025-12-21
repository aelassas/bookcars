import 'dotenv/config'
import { jest } from '@jest/globals'
import type { Model } from 'mongoose'
import * as env from '../src/config/env.config'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as databaseLangHelper from '../src/utils/databaseLangHelper'
import * as testHelper from './testHelper'
import LocationValue from '../src/models/LocationValue'
import Location from '../src/models/Location'
import Country from '../src/models/Country'
import ParkingSpot from '../src/models/ParkingSpot'
import mongoose from 'mongoose'

beforeAll(() => {
  // testHelper.initializeLogger()
})

describe('Test database connection', () => {
  it('should connect to database', async () => {
    // test success (connected)
    let res = await databaseHelper.connect(env.DB_URI, false, false)
    expect(res).toBeTruthy()
    // test success (already connected)
    res = await databaseHelper.connect(env.DB_URI, false, false)
    expect(res).toBeTruthy()
    await databaseHelper.close()
  })
})

describe('Test database connection failure', () => {
  it('should fail connecting to database', async () => {
    // test failure (wrong uri)
    const res = await databaseHelper.connect('wrong-uri', true, false)
    expect(res).toBeFalsy()
  })
})

describe('Test database initialization', () => {
  it('should initialize database', async () => {
    let res = await databaseHelper.connect(env.DB_URI, false, false)
    expect(res).toBeTruthy()

    const lv1 = new LocationValue({ language: 'en', value: 'location' })
    await lv1.save()
    const lv2 = new LocationValue({ language: 'pt', value: 'localização' })
    await lv2.save()
    const l1 = new Location({ country: testHelper.GetRandromObjectIdAsString(), values: [lv1._id, lv2._id] })
    await l1.save()
    const l2 = new Location({ country: testHelper.GetRandromObjectIdAsString(), values: [lv2._id] })
    await l2.save()

    // test batch deletion pf unsupported languages
    for (let i = 0; i < 1050; i++) {
      const lv2 = new LocationValue({ language: 'pt', value: 'localização' })
      await lv2.save()
    }

    const cv1 = new LocationValue({ language: 'en', value: 'country' })
    await cv1.save()
    const cv2 = new LocationValue({ language: 'pt', value: 'país' })
    await cv2.save()
    const c1 = new Country({ values: [cv1._id, cv2._id] })
    await c1.save()
    const c2 = new Country({ values: [cv2._id] })
    await c2.save()

    const pv1 = new LocationValue({ language: 'en', value: 'parking' })
    await pv1.save()
    const pv2 = new LocationValue({ language: 'pt', value: 'estacionamento' })
    await pv2.save()
    const ps1 = new ParkingSpot({ latitude: 1, longitude: 1, values: [pv1._id, pv2._id] })
    await ps1.save()
    const ps2 = new ParkingSpot({ latitude: 1, longitude: 1, values: [pv2._id] })
    await ps2.save()

    // test success (initialization)
    await testHelper.delay(5 * 1000)
    res = await databaseHelper.initialize()
    expect(res).toBeTruthy()

    const location1 = await Location.findById(l1._id)
    const location2 = await Location.findById(l2._id)
    await LocationValue.deleteMany({ _id: { $in: [...location1!.values, ...location2!.values] } })
    await location1?.deleteOne()
    await location2?.deleteOne()

    const country1 = await Country.findById(c1._id)
    const country2 = await Country.findById(c2._id)
    await LocationValue.deleteMany({ _id: { $in: [...country1!.values, ...country2!.values] } })
    await country1?.deleteOne()
    await country2?.deleteOne()

    const parkingSpot1 = await ParkingSpot.findById(ps1._id)
    const parkingSpot2 = await ParkingSpot.findById(ps2._id)
    await LocationValue.deleteMany({ _id: { $in: [...(parkingSpot1!.values as mongoose.Types.ObjectId[]), parkingSpot2!.values as mongoose.Types.ObjectId[]] } })
    await parkingSpot1?.deleteOne()
    await parkingSpot2?.deleteOne()

    // test success (initialization again)
    res = await databaseHelper.initialize()
    expect(res).toBeTruthy()

    await databaseHelper.close()
  })
})

describe('Test database initialization failures', () => {
  it('should check database initialization failures', async () => {
    // test failure (lost db connection)
    await databaseHelper.close()
    expect(await databaseLangHelper.initializeLocations()).toBeFalsy()
    expect(await databaseLangHelper.initializeCountries()).toBeFalsy()
    expect(await databaseLangHelper.initializeParkingSpots()).toBeFalsy()
  })
})

describe('createCollection', () => {
  const modelName = 'TestCollection'

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('calls createCollection if collection does not exist', async () => {
    const model = {
      modelName,
      db: {
        listCollections: jest.fn(() => Promise.resolve([{ name: 'OtherCollection' }])),
      },
      createCollection: jest.fn(),
      createIndexes: jest.fn(),
    } as unknown as Model<any>

    await databaseHelper.createCollection(model)

    expect(model.createCollection).toHaveBeenCalled()
    expect(model.createIndexes).toHaveBeenCalled()
  })

  it('does NOT call createCollection if collection exists', async () => {
    const model = {
      modelName,
      db: {
        listCollections: jest.fn(() => Promise.resolve([{ name: modelName }])),
      },
      createCollection: jest.fn(),
      createIndexes: jest.fn(),
    } as unknown as Model<any>

    await databaseHelper.createCollection(model)

    expect(model.createCollection).not.toHaveBeenCalled()
    expect(model.createIndexes).toHaveBeenCalled()
  })

  it('does NOT create indexes if createIndexes is false', async () => {
    const model = {
      modelName,
      db: {
        listCollections: jest.fn(() => Promise.resolve([{ name: modelName }])),
      },
      createCollection: jest.fn(),
      createIndexes: jest.fn(),
    } as unknown as Model<any>

    await databaseHelper.createCollection(model, false)

    expect(model.createIndexes).not.toHaveBeenCalled()
  })
})

describe('createTextIndex', () => {
  it('logs error when an exception is thrown', async () => {
    const error = new Error('Test error')

    const collection = {
      indexes: jest.fn(() => Promise.reject(error)),
      dropIndex: jest.fn(),
      createIndex: jest.fn(),
    }

    const model = { collection } as any

    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    }
    jest.unstable_mockModule('../src/utils/logger.js', () => logger)

    jest.resetModules()
    await jest.isolateModulesAsync(async () => {
      const dbh = await import('../src/utils/databaseHelper.js')
      await dbh.createTextIndex(model, 'myField', 'myIndex')

      expect(logger.error).toHaveBeenCalledWith('Failed to create text index:', error)
    })
  })
})

describe('checkAndUpdateTTL', () => {
  it('logs error when dropIndex throws', async () => {
    const name = 'ttlIndex'
    const seconds = 100
    const error = new Error('Drop failed')

    // Mock databaseTTLHelper
    const createTTLIndexMock = jest.fn(async () => { })

    jest.unstable_mockModule('../src/utils/databaseTTLHelper.js', () => ({
      createTTLIndex: createTTLIndexMock,
    }))

    // Mock logger module exports as jest.fn()
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }
    jest.unstable_mockModule('../src/utils/logger.js', () => logger)

    jest.resetModules() // reset module cache

    await jest.isolateModulesAsync(async () => {
      // Import databaseHelper after mocking logger and databaseTTLHelper
      const { checkAndUpdateTTL } = await import('../src/utils/databaseHelper.js')

      // Prepare a model mock with dropIndex throwing error
      const model = {
        modelName: 'TestModel',
        collection: {
          indexes: jest.fn(() => Promise.resolve([
            { name, expireAfterSeconds: seconds - 1 }, // force existing = true
          ])),
          dropIndex: jest.fn(() => Promise.reject(error)), // triggers catch block
          createIndex: jest.fn(() => Promise.resolve({}))
        },
      } as any

      await checkAndUpdateTTL(model, name, seconds)

      expect(model.collection.dropIndex).toHaveBeenCalledWith(name)
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to drop TTL index "${name}":`,
        error
      )
      expect(createTTLIndexMock).toHaveBeenCalledWith(model, name, seconds)
    })
  })
})

describe('initialize', () => {
  it('logs error when some routines fail', async () => {
    // Mock databaseLangHelper to simulate an error
    jest.unstable_mockModule('../src/utils/databaseLangHelper.js', () => ({
      initializeLocations: jest.fn(() => Promise.resolve(true)),
      initializeCountries: jest.fn(() => Promise.resolve(true)),
      initializeParkingSpots: jest.fn(() => Promise.resolve(false)),
    }))

    // Mock logger module exports as jest.fn()
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }
    jest.unstable_mockModule('../src/utils/logger.js', () => logger)

    jest.resetModules() // reset module cache

    await jest.isolateModulesAsync(async () => {
      // Import databaseHelper after mocking logger and databaseLangHelper
      const dbh = await import('../src/utils/databaseHelper.js')

      // test failure 
      const res = await dbh.connect(env.DB_URI, false, false)
      expect(res).toBeTruthy()
      await dbh.initialize()
      await dbh.close()

      expect(logger.error).toHaveBeenCalledWith('Some parts of the database failed to initialize')
    })
  })
})
