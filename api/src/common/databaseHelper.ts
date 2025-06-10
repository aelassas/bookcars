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
    await mongoose.connection.asPromise() // Explicitly wait for connection to be open
    logger.success('Database connected')
    isConnected = true
    return true
  } catch (err) {
    logger.error(' Database connection failed:', err instanceof Error ? err.message : err)
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
  logger.success('Database connection closed')
}

/**
 * Creates a text index on a model's field, falling back gracefully if language override is unsupported.
 *
 * Some MongoDB versions or configurations do not support `language_override: '_none'`.
 * This disables stemming and language processing for the text index.
 * If the index creation with this option fails, the function falls back to creating
 * a basic text index without language override.
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
    language_override: '_none', // Prevent MongoDB from expecting a language field (may not be supported on some versions)
    background: true,
    weights: { [field]: 1 },
  }

  try {
    // Drop the existing text index if it exists
    const indexes = await collection.indexes()
    const existingIndex = indexes.find((index) => index.name === indexName)
    if (existingIndex) {
      const sameOptions =
        existingIndex.default_language === fallbackOptions.default_language &&
        existingIndex.language_override === fallbackOptions.language_override
      if (!sameOptions) {
        await collection.dropIndex(indexName)
        logger.success(`Dropped old text index "${indexName}" due to option mismatch`)
      } else {
        logger.info(`Text index "${indexName}" already exists and is up to date`)
        return
      }
    }

    // Create new text index with fallback options
    await collection.createIndex({ [field]: 'text' }, fallbackOptions)
    logger.success(`Created text index "${indexName}" on "${field}" with fallback options`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    logger.warn(`Failed to use language override; falling back to basic text index: "${message}"`)
    try {
      // Retry creating a basic text index without override if needed
      await collection.createIndex({ [field]: 'text' }, {
        name: indexName,
        background: true,
        weights: { [field]: 1 },
      })
      logger.success(`Created basic text index "${indexName}" on "${field}" without language override`)
    } catch (fallbackErr) {
      logger.error(`Failed to create text index "${indexName}":`, fallbackErr)
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
const syncLanguageValues = async <T extends { values: (mongoose.Types.ObjectId | env.LocationValue)[] }>(
  collection: Model<T>,
  label: string
): Promise<boolean> => {
  try {
    // Load all documents with populated 'values' field
    const docs = await collection.find({}).populate<{ values: env.LocationValue[] }>({
      path: 'values',
      model: 'LocationValue',
    })

    const newValues: env.LocationValue[] = []
    const updates: { id: string; pushIds: string[] }[] = []

    for (const doc of docs) {
      // Ensure English value exists to copy from
      const en = doc.values.find((v) => v.language === 'en')
      if (!en) {
        logger.warn(`English value missing for ${label} document:`, doc.id)
        continue
      }

      // Find which languages are missing
      const missingLangs = env.LANGUAGES.filter((lang) => !doc.values.some((v) => v.language === lang))

      if (missingLangs.length > 0) {
        const additions: string[] = []
        for (const lang of missingLangs) {
          // Create new LocationValue with English value as fallback
          const val = new LocationValue({ language: lang, value: en.value })
          newValues.push(val)
          additions.push(val.id)
        }
        updates.push({ id: doc.id, pushIds: additions })
      }
    }

    // Insert all newly created LocationValues in one batch for efficiency
    if (newValues.length > 0) {
      await LocationValue.insertMany(newValues)
      logger.info(`Inserted ${newValues.length} new LocationValue docs for ${label}`)
    }

    // Update documents by pushing the new LocationValue references
    if (updates.length > 0) {
      const bulkOps = updates.map(({ id, pushIds }) => ({
        updateOne: {
          filter: { _id: id },
          update: { $push: { values: { $each: pushIds } } },
        },
      }))
      await collection.bulkWrite(bulkOps)
      logger.info(`Updated ${updates.length} ${label} documents with new language values`)
    }

    // Cleanup: Delete LocationValues with unsupported languages and remove references
    const cursor = LocationValue.find({ language: { $nin: env.LANGUAGES } }, { _id: 1 }).cursor()
    let obsoleteIdsBatch: string[] = []

    for await (const obsoleteVal of cursor) {
      obsoleteIdsBatch.push(obsoleteVal.id)

      if (obsoleteIdsBatch.length >= env.BATCH_SIZE) {
        await Promise.all([
          collection.updateMany({ values: { $in: obsoleteIdsBatch } }, { $pull: { values: { $in: obsoleteIdsBatch } } }),
          LocationValue.deleteMany({ _id: { $in: obsoleteIdsBatch } }),
        ])
        logger.info(`Cleaned up batch of ${obsoleteIdsBatch.length} obsolete LocationValues in ${label}`)
        obsoleteIdsBatch = []
      }
    }

    // Final cleanup for any remaining obsolete ids after loop
    if (obsoleteIdsBatch.length > 0) {
      await Promise.all([
        collection.updateMany({ values: { $in: obsoleteIdsBatch } }, { $pull: { values: { $in: obsoleteIdsBatch } } }),
        LocationValue.deleteMany({ _id: { $in: obsoleteIdsBatch } }),
      ])
      logger.info(`Cleaned up final batch of ${obsoleteIdsBatch.length} obsolete LocationValues in ${label}`)
    }

    logger.success(`${label} initialized successfully`)
    return true
  } catch (err) {
    logger.error(`Failed to initialize ${label}:`, err)
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
  try {
    await model.collection.createIndex(
      { [env.expireAt]: 1 },
      { name, expireAfterSeconds, background: true },
    )
  } catch (err) {
    logger.warn(`Failed to create TTL index "${name}" directly on collection:`, err)
    try {
      await model.createIndexes() // fallback to model-defined indexes
      logger.success(`Fallback to model.createIndexes() succeeded for TTL index "${name}"`)
    } catch (fallbackErr) {
      logger.error(`Fallback to model.createIndexes() failed for "${name}":`, fallbackErr)
    }
  }
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
  const indexTag = `${model.modelName}.${name}`
  const indexes = await model.collection.indexes()
  const existing = indexes.find((index) => index.name === name && index.expireAfterSeconds !== seconds)

  if (existing) {
    try {
      await model.collection.dropIndex(name)
    } catch (err) {
      logger.error(`Failed to drop TTL index "${name}":`, err)
    }
    await createTTLIndex(model, name, seconds)
  } else {
    logger.info(`TTL index "${indexTag}" is already up to date`)
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
        logger.success(`Created collection: ${modelName}`) // Optionally log success
      }
      return
    } catch (err) {
      const isLastAttempt = attempt === retries
      logger.warn(`Attempt ${attempt} failed to create ${modelName}:`, err) // Optionally log warning
      if (isLastAttempt) {
        logger.error(`Failed to create collection ${modelName} after ${retries} attempts.`) // Optionally log error
        throw err
      }
      // Wait before next retry (exponential backoff: 500ms, 1000ms, 2000ms)
      const wait = delay * Math.pow(2, attempt - 1)
      await helper.delay(wait)
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
    // Feature detection and conditional text index creation (backward compatible with older versions)
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
      logger.success('Database initialized successfully')
    } else {
      logger.error(' Some parts of the database failed to initialize')
    }

    return res
  } catch (err) {
    logger.error(' Database initialization error:', err)
    try {
      await close()
    } catch (closeErr) {
      logger.error(' Failed to close database connection after initialization failure:', closeErr)
    }
    return false
  }
}
