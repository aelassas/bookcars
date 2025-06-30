import 'dotenv/config'
import * as databaseHelper from '../src/common/databaseHelper'
import * as testHelper from './testHelper'
import * as env from '../src/config/env.config'
import Booking, { BOOKING_EXPIRE_AT_INDEX_NAME } from '../src/models/Booking'
import User, { USER_EXPIRE_AT_INDEX_NAME } from '../src/models/User'
import Token, { TOKEN_EXPIRE_AT_INDEX_NAME } from '../src/models/Token'
import LocationValue from '../src/models/LocationValue'

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
  // testHelper.initializeLogger()

  await databaseHelper.connect(env.DB_URI, false, false)
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
  await databaseHelper.close()
})

const createBookingIndex = async (expireAfterSeconds: number): Promise<void> => {
  await Booking.collection.createIndex({ expireAt: 1 }, { name: BOOKING_EXPIRE_AT_INDEX_NAME, expireAfterSeconds, background: true })
}

const createUserIndex = async (expireAfterSeconds: number): Promise<void> => {
  await User.collection.createIndex({ expireAt: 1 }, { name: USER_EXPIRE_AT_INDEX_NAME, expireAfterSeconds, background: true })
}

const createTokenIndex = async (expireAfterSeconds: number): Promise<void> => {
  await Token.collection.createIndex({ expireAt: 1 }, { name: TOKEN_EXPIRE_AT_INDEX_NAME, expireAfterSeconds, background: true })
}

const delay = async () => {
  await testHelper.delay(5 * 1000)
}

describe('Test database initialization', () => {
  it('should test database initialization', async () => {
    // test success (no configuration change)
    let res = await databaseHelper.initialize()
    expect(res).toBeTruthy()
    await delay()

    // test success (configuration change)
    const bookingIndexes = await Booking.collection.indexes()
    const bookingIndex = bookingIndexes.find((index) => index.name === BOOKING_EXPIRE_AT_INDEX_NAME)
    expect(bookingIndex).toBeDefined()

    if (bookingIndex) {
      const { expireAfterSeconds } = bookingIndex
      await Booking.collection.dropIndex(bookingIndex.name!)
      await createBookingIndex(expireAfterSeconds! + 1)
      await delay()
      res = await databaseHelper.initialize(false)
      expect(res).toBeTruthy()
    }

    const userIndexes = await User.collection.indexes()
    const userIndex = userIndexes.find((index) => index.name === USER_EXPIRE_AT_INDEX_NAME)
    expect(userIndex).toBeDefined()

    if (userIndex) {
      const { expireAfterSeconds } = userIndex
      await User.collection.dropIndex(userIndex.name!)
      await createUserIndex(expireAfterSeconds! + 1)
      await delay()
      res = await databaseHelper.initialize(false)
      expect(res).toBeTruthy()
    }

    const tokenIndexes = await Token.collection.indexes()
    const tokenIndex = tokenIndexes.find((index) => index.name === TOKEN_EXPIRE_AT_INDEX_NAME)
    expect(tokenIndex).toBeDefined()

    if (tokenIndex) {
      const { expireAfterSeconds } = tokenIndex
      await Token.collection.dropIndex(tokenIndex.name!)
      await createTokenIndex(expireAfterSeconds! + 1)
      await delay()
      res = await databaseHelper.initialize(false)
      expect(res).toBeTruthy()
      await delay()
    }

     // test success (text index)
    const indexName = 'value_text'
    const opts = {
      name: indexName,
      default_language: 'en',
      language_override: '_none',
      background: true,
      weights: { ['value']: 1 },
    }
    await LocationValue.collection.dropIndex(indexName)
    res = await databaseHelper.initialize()
    expect(res).toBeTruthy()
    await LocationValue.collection.dropIndex(indexName)
    await LocationValue.collection.createIndex({ ['value']: 'text' }, opts)
    res = await databaseHelper.initialize(false)
    expect(res).toBeTruthy()

    // test failure (loast db connection)
    try {
      await databaseHelper.close()
      res = await databaseHelper.initialize()
      expect(res).toBeFalsy()
    } catch (err) {
      console.error(err)
    } finally {
      res = await databaseHelper.connect(env.DB_URI, false, false)
      expect(res).toBeTruthy()
    }
  })
})
