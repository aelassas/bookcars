import Redis from 'ioredis'
import * as env from './env.config'
import * as logger from '../utils/logger'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
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
