import 'dotenv/config'
import { jest } from '@jest/globals'
import request from 'supertest'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../src/config/env.config'
import app from '../src/app'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as testHelper from './testHelper'
import BankDetails from '../src/models/BankDetails'
import mongoose from 'mongoose'

let bankDetails: bookcarsTypes.BankDetails | null = null
let id: string

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  testHelper.initializeLogger()

  await databaseHelper.connect(env.DB_URI, false, false)
  await testHelper.initialize()

  bankDetails = await BankDetails.findOne()
  if (bankDetails) {
    await BankDetails.deleteMany()
  }
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  if (!bankDetails || (id && (new mongoose.Types.ObjectId(bankDetails?._id)).equals(id))) {
    await BankDetails.deleteOne({ _id: id })
  }
  if (bankDetails) {
    await BankDetails.deleteMany()
    const _bankDetails = new BankDetails({
      accountHolder: bankDetails.accountHolder,
      bankName: bankDetails.bankName,
      iban: bankDetails.iban,
      swiftBic: bankDetails.swiftBic,
      showBankDetailsPage: bankDetails.showBankDetailsPage,
    })
    await _bankDetails.save()
  }
  await testHelper.close()
  await databaseHelper.close()
})

describe('POST /api/upsert-bank-details', () => {
  it('should upsert bank settings', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success with no bank details
    let payload: bookcarsTypes.UpsertBankDetailsPayload = {
      accountHolder: testHelper.GetRandromObjectIdAsString(),
      bankName: testHelper.GetRandromObjectIdAsString(),
      iban: testHelper.GetRandromObjectIdAsString(),
      swiftBic: testHelper.GetRandromObjectIdAsString(),
      showBankDetailsPage: false,
    }

    let res = await request(app)
      .post('/api/upsert-bank-details')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    id = res.body._id
    expect(res.body._id).toBeTruthy()
    expect(res.body.accountHolder).toBe(payload.accountHolder)
    expect(res.body.bankName).toBe(payload.bankName)
    expect(res.body.iban).toBe(payload.iban)
    expect(res.body.swiftBic).toBe(payload.swiftBic)
    expect(res.body.showBankDetailsPage).toBe(payload.showBankDetailsPage)

    // test success with bank details
    payload = {
      _id: res.body._id,
      accountHolder: testHelper.GetRandromObjectIdAsString(),
      bankName: testHelper.GetRandromObjectIdAsString(),
      iban: testHelper.GetRandromObjectIdAsString(),
      swiftBic: testHelper.GetRandromObjectIdAsString(),
      showBankDetailsPage: true,
    }
    res = await request(app)
      .post('/api/upsert-bank-details')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(200)
    expect(res.body.accountHolder).toBe(payload.accountHolder)
    expect(res.body.bankName).toBe(payload.bankName)
    expect(res.body.iban).toBe(payload.iban)
    expect(res.body.swiftBic).toBe(payload.swiftBic)
    expect(res.body.showBankDetailsPage).toBe(payload.showBankDetailsPage)

    // test failure
    jest.spyOn(BankDetails, 'findById').mockImplementation(() => {
      throw new Error('DB failure')
    })
    res = await request(app)
      .post('/api/upsert-bank-details')
      .set(env.X_ACCESS_TOKEN, token)
      .send(payload)
    expect(res.statusCode).toBe(400)
    expect(res.text).toContain('DB failure')
    jest.restoreAllMocks()
  })
})

describe('GET /api/bank-details', () => {
  it('should get bank settings', async () => {
    const token = await testHelper.signinAsAdmin()

    // test success
    let res = await request(app)
      .get('/api/bank-details')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(200)
    expect(res.body.accountHolder).toBeTruthy()
    expect(res.body.bankName).toBeTruthy()
    expect(res.body.iban).toBeTruthy()
    expect(res.body.swiftBic).toBeTruthy()
    expect(res.body.showBankDetailsPage).toBeTruthy()

    // test failure
    jest.spyOn(BankDetails, 'findOne').mockImplementation(() => {
      throw new Error('DB failure')
    })
    res = await request(app)
      .get('/api/bank-details')
      .set(env.X_ACCESS_TOKEN, token)
    expect(res.statusCode).toBe(400)
    expect(res.text).toContain('DB failure')
    jest.restoreAllMocks()
  })
})
