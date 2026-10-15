
import Redis from 'ioredis'
import * as logger from '../utils/logger'

const REDIS_URL = process.env.BC_REDIS_URL || 'redis://127.0.0.1:6379'

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  lazyConnect: true,
})  

redis.on('connect' , () => {
    logger.info('[Redis] successfully connected to Redis server')
})

redis.on('error', (err) => {
  logger.info('[Redis] Connection error (running without cache):', err.message)
})
export default redis