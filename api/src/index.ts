import 'dotenv/config'
import process from 'node:process'
import fs from 'node:fs/promises'
import http from 'node:http'
import https, { ServerOptions } from 'node:https'
import * as env from './config/env.config'
import * as databaseHelper from './common/databaseHelper'
import app from './app'

if (await databaseHelper.Connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)) {
    let server: http.Server | https.Server

    if (env.HTTPS) {
        https.globalAgent.maxSockets = Number.POSITIVE_INFINITY
        const privateKey = await fs.readFile(env.PRIVATE_KEY, 'utf8')
        const certificate = await fs.readFile(env.CERTIFICATE, 'utf8')
        const credentials: ServerOptions = { key: privateKey, cert: certificate }
        server = https.createServer(credentials, app)

        server.listen(env.PORT, () => {
            console.log('HTTPS server is running on Port', env.PORT)
        })
    } else {
        server = app.listen(env.PORT, () => {
            console.log('HTTP server is running on Port', env.PORT)
        })
    }

    const close = () => {
        console.log('\nGracefully stopping...')
        server.close(async () => {
            console.log(`HTTP${env.HTTPS ? 'S' : ''} server closed`)
            await databaseHelper.Close(true)
            console.log('MongoDB connection closed')
            process.exit(0)
        })
    }

    ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => process.on(signal, close))
}
