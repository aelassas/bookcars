import { afterAll } from '@jest/globals'
import redis from '../src/config/redis.js'

// Ferme proprement la connexion Redis après l'exécution de toutes les suites de tests
afterAll(async () => {
  try {
    await redis.quit()
  } catch {
    redis.disconnect()
  }
})
