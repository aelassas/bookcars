import 'dotenv/config'
import process from 'node:process'
import fs from 'node:fs/promises'
import http from 'node:http'
import https, { ServerOptions } from 'node:https'
import * as env from './config/env.config'
import * as databaseHelper from './common/databaseHelper'
import app from './app'
import * as logger from './common/logger'

/**
 * Creates and returns an HTTP or HTTPS server based on environment configuration.
 * 
 * @returns {Promise<http.Server | https.Server>} The server instance
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
 * If server shutdown takes longer than this, the process will be forcefully exited.
 * 
 * @constant {number}
 */
const shutdownTimeoutMs = 10_000

/**
 * Starts the server and sets up graceful shutdown handlers.
 */
const start = async (): Promise<void> => {
  try {
    const connected = await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)
    const initialized = await databaseHelper.initialize()

    if (!connected || !initialized) {
      logger.error('Failed to connect or initialize the database')
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
