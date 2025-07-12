import 'dotenv/config'
import { jest } from '@jest/globals'
import request from 'supertest'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as settingController from '../src/controllers/settingController'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import Setting from '../src/models/Setting'
import app from '../src/app'
import * as env from '../src/config/env.config'

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  await databaseHelper.connect(env.DB_URI, false, false)

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

describe('Initialize settings', () => {
  it('should initialize settings', async () => {
    // init
    const settings = await Setting.findOne({}).lean()
    await Setting.deleteMany({})

    // test success
    let res = await settingController.init()
    expect(res).toBeTruthy()
    const count = await Setting.findOne({}).countDocuments()
    expect(count).toBe(1)

    // restore
    if (settings) {
      await Setting.deleteMany({})
      await new Setting({
        minPickupHours: settings.minPickupHours,
        minRentalHours: settings.minRentalHours,
        minPickupDropoffHour: settings.minPickupDropoffHour,
        maxPickupDropoffHour: settings.maxPickupDropoffHour,
      }).save()
    }

    // test failure
    await databaseHelper.close()
    res = await settingController.init()
    expect(res).toBeFalsy()
    const connRes = await databaseHelper.connect(env.DB_URI, false, false)
    expect(connRes).toBeTruthy()
  })
})

describe('GET /api/settings', () => {
  it('should get settings', async () => {
    // test success
    let res = await request(app)
      .get('/api/settings')
    expect(res.statusCode).toBe(200)
    expect(res.body.minPickupHours).toBeGreaterThanOrEqual(1)
    expect(res.body.minRentalHours).toBeGreaterThanOrEqual(1)
    expect(res.body.minPickupDropoffHour).toBeGreaterThanOrEqual(0)
    expect(res.body.minPickupDropoffHour).toBeLessThanOrEqual(23)
    expect(res.body.maxPickupDropoffHour).toBeGreaterThanOrEqual(0)
    expect(res.body.maxPickupDropoffHour).toBeLessThanOrEqual(23)

    // test failure (simulate error)
    await jest.unstable_mockModule('../src/models/Setting.js', () => ({
      default: {
        finOne: jest.fn(() => Promise.reject(new Error('DB error'))),
      }
    }))
    jest.resetModules()
    await jest.isolateModulesAsync(async () => {
      const env = await import('../src/config/env.config.js')
      const newApp = (await import('../src/app.js')).default
      const dbh = await import('../src/utils/databaseHelper.js')
      await dbh.connect(env.DB_URI, false, false)
      res = await request(newApp)
        .get('/api/settings')
      expect(res.statusCode).toBe(400)
      await dbh.close()
    })
  })
})

describe('PUT /api/update-settings', () => {
  it('should update settings', async () => {
    const token = await testHelper.signinAsAdmin()

    // init
    const settings = await Setting.findOne({}).lean()
    expect(settings).toBeTruthy()
    const {
      minPickupHours,
      minRentalHours,
      minPickupDropoffHour,
      maxPickupDropoffHour,
    } = settings!

    // test success
    const payload: bookcarsTypes.UpdateSettingsPayload = {
      minPickupHours: 2,
      minRentalHours: 3,
      minPickupDropoffHour: 9,
      maxPickupDropoffHour: 19,
    }

    let res = await request(app)
      .put('/api/update-settings')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.minPickupHours).toBe(payload.minPickupHours)
    expect(res.body.minRentalHours).toBe(payload.minRentalHours)
    expect(res.body.minPickupDropoffHour).toBe(payload.minPickupDropoffHour)
    expect(res.body.maxPickupDropoffHour).toBe(payload.maxPickupDropoffHour)
    const _settings = await Setting.findOne({})
    expect(_settings).toBeTruthy()
    expect(_settings!.minPickupHours).toBe(payload.minPickupHours)
    expect(_settings!.minRentalHours).toBe(payload.minRentalHours)
    expect(_settings!.minPickupDropoffHour).toBe(payload.minPickupDropoffHour)
    expect(_settings!.maxPickupDropoffHour).toBe(payload.maxPickupDropoffHour)

    // test not found
    await Setting.deleteMany({})
    res = await request(app)
      .put('/api/update-settings')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(204)

    await new Setting({
      minPickupHours,
      minRentalHours,
      minPickupDropoffHour,
      maxPickupDropoffHour,
    }).save()

    // test failure (simulate error)
    await jest.unstable_mockModule('../src/models/Setting.js', () => ({
      default: {
        finOne: jest.fn(() => Promise.reject(new Error('DB error')))
      }
    }))
    jest.resetModules()
    await jest.isolateModulesAsync(async () => {
      const env = await import('../src/config/env.config.js')
      const newApp = (await import('../src/app.js')).default
      const dbh = await import('../src/utils/databaseHelper.js')
      await dbh.connect(env.DB_URI, false, false)
      res = await request(newApp)
        .put('/api/update-settings')
        .set(env.X_ACCESS_TOKEN, token)
        .send(payload)
      expect(res.statusCode).toBe(400)
      await dbh.close()
    })
  })
})
