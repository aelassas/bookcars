import cors from 'cors'
import * as helper from '../utils/helper'
import * as env from '../config/env.config'
import * as logger from '../utils/logger'

const whitelist = [
  helper.trimEnd(env.ADMIN_HOST, '/'),
  helper.trimEnd(env.FRONTEND_HOST, '/'),
  ...(process.env.NODE_ENV === 'development'
    ? ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:8080', 'http://127.0.0.1:8080',
       'http://localhost:3002', 'http://127.0.0.1:3002', 'http://localhost:8081', 'http://127.0.0.1:8081',
       'http://localhost:3003', 'http://127.0.0.1:3003', 'http://localhost:8082', 'http://127.0.0.1:8082']
    : []),
]

const isPrivateLanFrontend = (origin: string | undefined): boolean => {
  if (process.env.NODE_ENV !== 'development' || !origin) {
return false
}
  try {
    const { protocol, hostname, port } = new URL(origin)
    const privateIPv4 = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(hostname)
    return protocol === 'http:' && ['8080', '8081', '8082', '3001', '3002', '3003'].includes(port) && privateIPv4
  } catch {
    return false
  }
}

/**
 * CORS configuration.
 *
 * @type {cors.CorsOptions}
 */
const CORS_CONFIG: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || whitelist.indexOf(helper.trimEnd(origin, '/')) !== -1 || isPrivateLanFrontend(origin)) {
      callback(null, true)
    } else {
      const message = `Not allowed by CORS: ${origin}`
      logger.error(message)
      callback(new Error(message))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
}

/**
 * CORS middleware.
 *
 * @export
 * @returns {*}
 */
export default () => cors(CORS_CONFIG)
