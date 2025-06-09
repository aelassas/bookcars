import mongoose, { ConnectOptions, Model } from 'mongoose'
import * as env from '../config/env.config'
import * as logger from './logger'
import * as helper from './helper'
import Booking, { BOOKING_EXPIRE_AT_INDEX_NAME } from '../models/Booking'
import Car from '../models/Car'
import Location from '../models/Location'
import LocationValue from '../models/LocationValue'
import Notification from '../models/Notification'
import NotificationCounter from '../models/NotificationCounter'
import PushToken from '../models/PushToken'
import Token, { TOKEN_EXPIRE_AT_INDEX_NAME } from '../models/Token'
import User, { USER_EXPIRE_AT_INDEX_NAME } from '../models/User'
import Country from '../models/Country'
import ParkingSpot from '../models/ParkingSpot'
import AdditionalDriver from '../models/AdditionalDriver'
import BankDetails from '../models/BankDetails'
import DateBasedPrice from '../models/DateBasedPrice'

/**
 * Tracks the current database connection status to prevent redundant connections.
 * Set to true after a successful connection is established via `connect()`,
 * and reset to false after `close()` is called.
 * 
 * @type {boolean}
 */
let isConnected = false

/**
 * Connects to database.
 *
 * @async
 * @param {string} uri 
 * @param {boolean} ssl 
 * @param {boolean} debug 
 * @returns {Promise<boolean>} 
 */
export const connect = async (uri: string, ssl: boolean, debug: boolean): Promise<boolean> => {
  if (isConnected) {
    return true
  }

  const options: ConnectOptions = ssl
    ? {
      tls: true,
      tlsCertificateKeyFile: env.DB_SSL_CERT,
      tlsCAFile: env.DB_SSL_CA,
    }
    : {}

  mongoose.set('debug', debug)
  mongoose.Promise = globalThis.Promise

  try {
    await mongoose.connect(uri, options)
    // Explicitly wait for connection to be open
    await mongoose.connection.asPromise()
    logger.info('✅ Database connected')
    isConnected = true
    return true
  } catch (err) {
    logger.error('❌ Database connection failed:', err)
    return false
  }
}

/**
 * Closes database connection.
 *
 * @async
 * @param {boolean} [force=false] 
 * @returns {Promise<void>} 
 */
export const close = async (force = false): Promise<void> => {
  await mongoose.connection.close(force)
  isConnected = false
  logger.info('✅ Database connection closed')
}

/**
 * Creates a text index on a model's field, falling back gracefully if language override is unsupported.
 *
 * @param {Model<T>} model - The Mongoose model.
 * @param {string} field - The field to index.
 * @param {string} indexName - The desired index name.
 */
export const createTextIndexWithFallback = async <T>(model: Model<T>, field: string, indexName: string) => {
  const collection = model.collection
  const fallbackOptions = {
    name: indexName,
    default_language: 'none', // This disables stemming
    language_override: '_none', // Prevent MongoDB from expecting a language field
    background: true,
    weights: { [field]: 1 },
  }

  try {
    // Drop the existing text index if it exists
    const indexes = await collection.indexes()
    const existingIndex = indexes.find(i => i.name === indexName)
    if (existingIndex) {
      const sameOptions =
        existingIndex.default_language === fallbackOptions.default_language &&
        existingIndex.language_override === fallbackOptions.language_override
      if (!sameOptions) {
        await collection.dropIndex(indexName)
        logger.info(`✅ Dropped old text index "${indexName}" due to option mismatch`)
      } else {
        logger.info(`ℹ️ Text index "${indexName}" already exists and is up to date`)
        return
      }
    }

    // Create new text index with fallback options
    await collection.createIndex({ [field]: 'text' }, fallbackOptions)
    logger.info(`✅ Created text index "${indexName}" on "${field}" with fallback options`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    logger.info(`⚠️ Failed to use language override; falling back to basic text index: "${message}"`)
    try {
      // Retry creating a basic text index without override if needed
      await collection.createIndex({ [field]: 'text' }, {
        name: indexName,
        background: true,
        weights: { [field]: 1 },
      })
      logger.info(`✅ Created basic text index "${indexName}" on "${field}" without language override`)
    } catch (fallbackErr) {
      logger.error(`❌ Failed to create text index "${indexName}":`, fallbackErr)
    }
  }
}

/**
 * Synchronizes multilingual LocationValue entries for a given collection (such as Location, Country, or ParkingSpot) 
 * to ensure that each document has language-specific values for all supported languages defined in env.LANGUAGES.
 *
 * @async
 * @param {Model<T>} collection 
 * @param {string} label 
 * @returns {Promise<boolean>}
 */
const syncLanguageValues = async <T extends { values: (mongoose.Types.ObjectId | env.LocationValue)[] }>(collection: Model<T>, label: string) => {
  try {
    logger.info(`ℹ️ Initializing ${label}...`)
    const docs = await collection.find({}).populate<{ values: env.LocationValue[] }>({ path: 'values', model: 'LocationValue' })

    for (const doc of docs) {
      const en = doc.values.find((v) => v.language === 'en')
      if (!en) {
        logger.info(`⚠️ English value missing for ${label}:`, doc.id)
        continue
      }

      // Add missing LocationValues in env.LANGUAGES
      for (const lang of env.LANGUAGES) {
        if (!doc.values.some((v) => v.language === lang)) {
          const val = new LocationValue({ language: lang, value: en.value })
          await val.save()
          const fresh = await collection.findById(doc.id)
          if (fresh) {
            fresh.values.push(val.id)
            await fresh.save()
          }
        }
      }
    }

    // Delete LocationValue nin env.LANGUAGES
    const obsolete = await LocationValue.find({ language: { $nin: env.LANGUAGES } })
    const obsoleteIds = obsolete.map((v) => v.id)

    for (const val of obsolete) {
      const affected = await collection.find({ values: val.id })
      for (const doc of affected) {
        doc.values = doc.values.filter((v) => !v.equals(val.id))
        await doc.save()
      }
    }
    await LocationValue.deleteMany({ _id: { $in: obsoleteIds } })

    logger.info(`✅ ${label} initialized`)
    return true
  } catch (err) {
    logger.error(`❌ Failed to initialize ${label}:`, err)
    return false
  }
}

/**
 * Initialiazes locations.
 *
 * @returns {Promise<boolean>} 
 */
export const initializeLocations = () => syncLanguageValues(Location, 'locations')

/**
 * Initialiazes countries.
 *
 * @returns {Promise<boolean>} 
 */
export const initializeCountries = () => syncLanguageValues(Country, 'countries')

/**
 * Initialiazes parkingSpots.
 *
 * @returns {Promise<boolean>} 
 */
export const initializeParkingSpots = () => syncLanguageValues(ParkingSpot, 'parkingSpots')

/**
 * Creates TTL index.
 *
 * @async
 * @param {Model<T>} model 
 * @param {string} name 
 * @param {number} expireAfterSeconds 
 * @returns {Promise<void>} 
 */
const createTTLIndex = async <T>(model: Model<T>, name: string, expireAfterSeconds: number) => {
  await model.collection.createIndex(
    { expireAt: 1 },
    { name, expireAfterSeconds, background: true },
  )
}

/**
 * Updates TTL index.
 *
 * @async
 * @param {Model<T>} model 
 * @param {string} name 
 * @param {number} seconds 
 * @returns {Promise<void>} 
 */
const checkAndUpdateTTL = async <T>(model: Model<T>, name: string, seconds: number) => {
  const indexName = `${model.modelName}.${name}`
  logger.info(`ℹ️ Checking TTL index: ${indexName}`)
  const indexes = await model.collection.indexes()
  const existing = indexes.find((index) => index.name === name && index.expireAfterSeconds !== seconds)

  if (existing) {
    try {
      await model.collection.dropIndex(name)
    } catch (err) {
      logger.error(`❌ Failed to drop index "${name}"`, err)
    } finally {
      await createTTLIndex(model, name, seconds)
      await model.createIndexes()
    }
  } else {
    logger.info(`ℹ️ TTL index "${indexName}" is already up to date`)
  }
}

/**
 * Creates a Model with retry logic.
 *
 * @async
 * @template T 
 * @param {Model<T>} model 
 * @param {number} [retries=3] 
 * @param {number} [delay=500] 
 * @returns {Promise<void>} 
 */
const createCollection = async <T>(model: Model<T>, retries = 3, delay = 500): Promise<void> => {
  const modelName = model.modelName

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const collections = await model.db.listCollections()
      const exists = collections.some((col) => col.name === modelName)
      if (!exists) {
        await model.createCollection()
        await model.createIndexes()
        // Optionally log success
        logger.info(`✅ Created collection: ${modelName}`)
      } else {
        // Optionally log existing collection
        logger.info(`ℹ️ Collection already exists: ${modelName}`)
      }
      return
    } catch (err) {
      const isLastAttempt = attempt === retries
      // Optionally log warning
      logger.info(`⚠️ Attempt ${attempt} failed to create ${modelName}:`, err)
      if (isLastAttempt) {
        // Optionally log error
        logger.error(`❌ Failed to create collection ${modelName} after ${retries} attempts.`)
        throw err
      }
      // Wait before next retry (exponential backoff: 500ms, 1000ms, 2000ms)
      await helper.delay(delay * 2 ** (attempt - 1))
    }
  }
}

/**
 * Helper utility to infer the union type of array elements.
 *
 * @template {readonly unknown[]} T 
 * @param {T} models 
 * @returns {T} 
 */
const defineModels = <T extends readonly unknown[]>(models: T) => models

/**
 * Array of Mongoose model constructors used throughout the application.
 * Each element corresponds to a Mongoose model imported from the respective model files.
 *
 * The array is a readonly tuple preserving the exact model constructor types.
 * 
 */
export const models = defineModels([
  AdditionalDriver,
  BankDetails,
  Booking,
  Car,
  Country,
  DateBasedPrice,
  Location,
  LocationValue,
  Notification,
  NotificationCounter,
  ParkingSpot,
  PushToken,
  Token,
  User,
] as const)

/**
 * Initializes database.
 *
 * @async
 * @returns {Promise<boolean>} 
 */
export const initialize = async (): Promise<boolean> => {
  try {
    //
    // Check if connection is ready
    //
    if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) {
      throw new Error('Mongoose connection is not ready')
    }

    //
    // Create collections
    //
    await Promise.all(models.map((model) => createCollection(model as Model<unknown>)))

    //
    // Feature Detection and Conditional Index Creation
    //
    await createTextIndexWithFallback(LocationValue, 'value', 'value_text')
    await createTextIndexWithFallback(Car, 'name', 'name_text')

    //
    // Update TTL index if configuration changes
    //
    await Promise.all([
      checkAndUpdateTTL(Booking, BOOKING_EXPIRE_AT_INDEX_NAME, env.BOOKING_EXPIRE_AT),
      checkAndUpdateTTL(User, USER_EXPIRE_AT_INDEX_NAME, env.USER_EXPIRE_AT),
      checkAndUpdateTTL(Token, TOKEN_EXPIRE_AT_INDEX_NAME, env.TOKEN_EXPIRE_AT),
    ])

    //
    // Initialize collections
    //
    const results = await Promise.all([
      initializeLocations(),
      initializeCountries(),
      initializeParkingSpots(),
    ])

    const res = results.every(Boolean)

    if (res) {
      logger.info('✅ Database initialized successfully')
    } else {
      logger.error('❌ Some parts of the database failed to initialize')
    }

    return res
  } catch (err) {
    logger.error('❌ Database initialization error:', err)
    try {
      await close()
    } catch (closeErr) {
      logger.error('❌ Failed to close database connection after initialization failure:', closeErr)
    }
    return false
  }
}
