import { afterAll } from '@jest/globals'
import redis from '../src/config/redis.js'

// Cleanly close the Redis TCP socket after all tests finish
afterAll(async () => {
  try {
    await redis.quit()
  } catch {
    redis.disconnect()
  }
})
