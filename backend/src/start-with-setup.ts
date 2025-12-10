import 'dotenv/config'
import * as bookcarsTypes from ':bookcars-types'
import * as env from './config/env.config'
import * as databaseHelper from './utils/databaseHelper'
import User from './models/User'
import * as logger from './utils/logger'
import * as authHelper from './utils/authHelper'
import process from 'node:process'
import fs from 'node:fs/promises'
import http from 'node:http'
import https, { ServerOptions } from 'node:https'
import app from './app'

/**
 * Runs the database setup (creates admin user if needed)
 */
const runSetup = async (): Promise<void> => {
  try {
    const connected = await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)

    if (!connected) {
      logger.error('Failed to connect to the database')
      throw new Error('Database connection failed')
    }

    // create admin user if it doesn't exist
    const adminUser = await User.findOne({ email: env.ADMIN_EMAIL })

    if (!adminUser) {
      const password = 'B00kC4r5'
      const passwordHash = await authHelper.hashPassword(password)

      const newAdmin = new User({
        fullName: 'admin',
        email: env.ADMIN_EMAIL,
        password: passwordHash,
        language: env.DEFAULT_LANGUAGE,
        type: bookcarsTypes.UserType.Admin,
        active: true,
        verified: true,
      })
      await newAdmin.save()
      logger.info('Admin user created successfully')
    } else {
      logger.info('Admin user already exists')
    }
  } catch (err) {
    logger.error('Error during setup:', err)
    throw err
  }
}

/**
 * Creates and returns an HTTP or HTTPS server based on environment configuration.
 */
const createServer = async (): Promise<http.Server | https.Server> => {
  if (env.HTTPS) {
    https.globalAgent.maxSockets = Infinity
    const [privateKey, certificate] = await Promise.all([
      fs.readFile(env.PRIVATE_KEY, 'utf8'),
      fs.readFile(env.CERTIFICATE, 'utf8'),
    ])
    const credentials: ServerOptions = { key: privateKey, cert: certificate }
    return https.createServer(credentials, app)
  }

  http.globalAgent.maxSockets = Infinity
  return http.createServer(app)
}

/**
 * Shutdown timeout duration in milliseconds.
 */
const shutdownTimeoutMs = 10_000

/**
 * Starts the server after running setup.
 */
const start = async (): Promise<void> => {
  try {
    // Run setup first
    await runSetup()

    // Database should already be connected from setup, but ensure it's initialized
    const initialized = await databaseHelper.initialize()

    if (!initialized) {
      logger.error('Failed to initialize the database')
      process.exit(1)
    }

    const protocol = env.HTTPS ? 'HTTPS' : 'HTTP'
    const server = await createServer()

    server.listen(env.PORT, () => {
      logger.info(`${protocol} server is running on port ${env.PORT}`)
    })

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}. Gracefully stopping server...`)

      // Force shutdown if close hangs after timeout
      const shutdownTimeout = setTimeout(() => {
        logger.warn('Forced shutdown due to timeout')
        process.exit(1)
      }, shutdownTimeoutMs)

      server.close(async () => {
        clearTimeout(shutdownTimeout)
        logger.info(`${protocol} server closed`)
        await databaseHelper.close(true)
        process.exit(0)
      })
    }

    ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => process.once(signal, shutdown))
  } catch (err) {
    logger.error('Server failed to start', err)
    process.exit(1)
  }
}

start() // Start server
