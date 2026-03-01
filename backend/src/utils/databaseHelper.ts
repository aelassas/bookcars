import mongoose, { ConnectOptions, Model } from 'mongoose'
import * as env from '../config/env.config'
import * as logger from './logger'
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
import * as databaseTTLHelper from './databaseTTLHelper'
import * as databaseLangHelper from './databaseLangHelper'
import * as settingController from '../controllers/settingController'

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
  mongoose.set('autoIndex', process.env.NODE_ENV !== 'production')
  mongoose.Promise = globalThis.Promise

  try {
    await mongoose.connect(uri, options)
    await mongoose.connection.asPromise() // Explicitly wait for connection to be open
    logger.info('Database connected')
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
  logger.info('Database connection closed')
}

/**
 * Creates a text index on a model's field.
 *
 * @param {Model<T>} model - The Mongoose model.
 * @param {string} field - The field to index.
 * @param {string} indexName - The desired index name.
 */
export const createTextIndex = async <T>(model: Model<T>, field: string, indexName: string) => {
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
    const existingIndex = indexes.find((index) => index.name === indexName)
    if (existingIndex) {
      const sameOptions =
        existingIndex.default_language === fallbackOptions.default_language &&
        existingIndex.language_override === fallbackOptions.language_override
      if (!sameOptions) {
        await collection.dropIndex(indexName)
        logger.info(`Dropped old text index "${indexName}" due to option mismatch`)
      } else {
        logger.info(`Text index "${indexName}" already exists and is up to date`)
        return
      }
    }

    // Create new text index with fallback options
    await collection.createIndex({ [field]: 'text' }, fallbackOptions)
    logger.info(`Created text index "${indexName}" on "${field}" with fallback options`)
  } catch (err) {
    logger.error('Failed to create text index:', err)
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
export const checkAndUpdateTTL = async <T>(
  model: Model<T>,
  name: string,
  seconds: number
) => {
  const indexTag = `${model.modelName}.${name}`
  const indexes = await model.collection.indexes()

  const existing = indexes.find((index) => index.name === name)

  // 1. Index does not exist → create it
  if (!existing) {
    logger.info(`Creating TTL index "${indexTag}" (${seconds}s)`)
    await databaseTTLHelper.createTTLIndex(model, name, seconds)
    return
  }

  // 2. TTL differs → update it
  if (existing.expireAfterSeconds !== seconds) {
    logger.info(
      `Updating TTL index "${indexTag}" from ${existing.expireAfterSeconds} to ${seconds}`
    )

    try {
      await model.collection.dropIndex(name)
    } catch (err: any) {
      if (err.codeName !== 'IndexNotFound') {
        logger.error(`Failed to drop TTL index "${indexTag}":`, err)
        throw err
      }
    }

    await databaseTTLHelper.createTTLIndex(model, name, seconds)
    return
  }

  // 3. Already correct
  logger.info(`TTL index "${indexTag}" is already up to date`)
}

/**
 * Creates a Model.
 *
 * @async
 * @template T 
 * @param {Model<T>} model 
 * @param {boolean} createIndexes
 * @returns {Promise<void>} 
 */
export const createCollection = async <T>(model: Model<T>, createIndexes: boolean = true): Promise<void> => {
  const modelName = model.modelName
  const collections = await model.db.listCollections()
  const exists = collections.some((col) => col.name === modelName)
  if (!exists) {
    await model.createCollection()
    logger.info(`Created collection: ${modelName}`) // Optionally log success
  }

  if (createIndexes) {
    await model.createIndexes()
    logger.info(`Indexes created for collection: ${modelName}`)
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
 * @param {boolean} createIndexes
 * @returns {Promise<boolean>} 
 */
export const initialize = async (createIndexes: boolean = true): Promise<boolean> => {
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
    await Promise.all(models.map((model) => createCollection(model as Model<unknown>, createIndexes)))

    //
    // Feature detection and conditional text index creation (backward compatible with older versions)
    //
    await createTextIndex(LocationValue, 'value', 'value_text')
    await createTextIndex(Car, 'name', 'name_text')

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
      databaseLangHelper.initializeLocations(),
      databaseLangHelper.initializeCountries(),
      databaseLangHelper.initializeParkingSpots(),
      settingController.init(),
    ])

    const res = results.every(Boolean)

    if (res) {
      logger.info('Database initialized successfully')
    } else {
      logger.error('Some parts of the database failed to initialize')
    }

    return res
  } catch (err) {
    logger.error(' Database initialization error:', err)
    await close()
    return false
  }
}
