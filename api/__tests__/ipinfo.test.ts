import 'dotenv/config'
import request from 'supertest'
import * as env from '../src/config/env.config'
import app from '../src/app'
import * as databaseHelper from '../src/common/databaseHelper'
import * as testHelper from './testHelper'

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
  await testHelper.close()
  await databaseHelper.close()
})

describe('GET /api/country-code', () => {
  it('should get country from ip', async () => {
    // test without x-forwarded-for
    let res = await request(app)
      .get('/api/country-code')
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('US')

    // test with x-forwarded-for
    res = await request(app)
      .get('/api/country-code')
      .set('x-forwarded-for', '51.91.60.241') // OVH France (Roubaix Data Center)
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('FR')

    // test with x-forwarded-for IPv6-mapped IPv4 address
    res = await request(app)
      .get('/api/country-code')
      .set('x-forwarded-for', '::ffff:51.91.60.241')
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('FR')

    // test wrong ip address
    res = await request(app)
      .get('/api/country-code')
      .set('x-forwarded-for', 'wrong ip address')
    expect(res.statusCode).toBe(200)
    expect(res.body).toBe('US')
  })
})
