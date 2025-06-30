import { Model } from 'mongoose'
import * as env from '../config/env.config'

/**
 * Creates TTL index.
 *
 * @async
 * @param {Model<T>} model 
 * @param {string} name 
 * @param {number} expireAfterSeconds 
 * @returns {Promise<void>} 
 */
export const createTTLIndex = async <T>(model: Model<T>, name: string, expireAfterSeconds: number) => {
  await model.collection.createIndex(
    { [env.expireAt]: 1 },
    { name, expireAfterSeconds, background: true },
  )
}
