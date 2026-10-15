import { afterAll } from '@jest/globals'
import redis from '../src/config/redis.js'

// Closes the Redis connection after all test suites have run
afterAll(async () => {
  try {
    await redis.quit()
  } catch {
    redis.disconnect()
  }
})
