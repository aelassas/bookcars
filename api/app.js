import fs from 'node:fs/promises'
import https from 'node:https'
import process from 'node:process'
import app from './server.js'

const PORT = Number.parseInt(process.env.BC_PORT) || 4002
const HTTPS = process.env.BC_HTTPS.toLocaleLowerCase() === 'true'
const PRIVATE_KEY = process.env.BC_PRIVATE_KEY
const CERTIFICATE = process.env.BC_CERTIFICATE

if (HTTPS) {
  https.globalAgent.maxSockets = Number.POSITIVE_INFINITY
  const privateKey = await fs.readFile(PRIVATE_KEY, 'utf8')
  const certificate = await fs.readFile(CERTIFICATE, 'utf8')
  const credentials = { key: privateKey, cert: certificate }
  const httpsServer = https.createServer(credentials, app)

  httpsServer.listen(PORT, () => {
    console.log('HTTPS server is running on Port:', PORT)
  })
} else {
  app.listen(PORT, () => {
    console.log('HTTP server is running on Port:', PORT)
  })
}
