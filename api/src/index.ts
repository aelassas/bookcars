import 'dotenv/config'
import process from 'node:process'
import asyncFs from 'node:fs/promises'
import http from 'node:http'
import https, { ServerOptions } from 'node:https'
import * as env from './config/env.config'
import * as databaseHelper from './common/databaseHelper'
import app from './app'
import * as logger from './common/logger'

if ((await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)) && (await databaseHelper.initialize())) {
  let server: http.Server | https.Server

  if (env.HTTPS) {
    https.globalAgent.maxSockets = Number.POSITIVE_INFINITY
    const privateKey = await asyncFs.readFile(env.PRIVATE_KEY, 'utf8')
    const certificate = await asyncFs.readFile(env.CERTIFICATE, 'utf8')
    const credentials: ServerOptions = { key: privateKey, cert: certificate }
    server = https.createServer(credentials, app)

    server.listen(env.PORT, () => {
      logger.info('HTTPS server is running on Port', env.PORT)
    })
  } else {
    server = app.listen(env.PORT, () => {
      logger.info('HTTP server is running on Port', env.PORT)
    })
  }

  const close = () => {
    logger.info('Gracefully stopping...')
    server.close(async () => {
      logger.info(`HTTP${env.HTTPS ? 'S' : ''} server closed`)
      await databaseHelper.close(true)
      logger.info('Database connection closed')
      process.exit(0)
    })
  }

  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => process.on(signal, close))
}
