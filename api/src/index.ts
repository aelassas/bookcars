import 'dotenv/config'
import process from 'node:process'
import fs from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import mongoose from 'mongoose'
import app from './server'
import * as env from './config/env.config'

let server: http.Server | https.Server
if (env.HTTPS) {
    https.globalAgent.maxSockets = Number.POSITIVE_INFINITY
    const privateKey = await fs.readFile(env.PRIVATE_KEY, 'utf8')
    const certificate = await fs.readFile(env.CERTIFICATE, 'utf8')
    const credentials = { key: privateKey, cert: certificate }
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
        await mongoose.connection.close(true)
        console.log('MongoDB connection closed')
        process.exit(0)
    })
}

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => process.on(signal, close))
