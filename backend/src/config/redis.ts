import Redis from 'ioredis'
import * as env from './env.config'
import * as logger from '../utils/logger'

const isTest = env.CI

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: isTest ? 0 : 1,
  enableOfflineQueue: !isTest, // Stops ioredis from queuing requests and stalling when Redis is down
  enableReadyCheck: false,
  lazyConnect: true,
})  

redis.on('connect', () => {
  logger.info('[Redis] Successfully connected to Redis server.')
})

redis.on('error', (err) => {
  logger.info('[Redis] Connection error (running without cache):', err.message)
})

export default redis
