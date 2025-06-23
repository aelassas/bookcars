import { Request } from 'express'
import { jwtVerify, SignJWT } from 'jose'
import * as helper from './helper'
import * as env from '../config/env.config'

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET)
const jwtAlg = 'HS256'

export type SessionData = {
  id: string
}

/**
 * Sign and return the JWT.
 *
 * @async
 * @param {SessionData} payload
 * @param {?boolean} [stayConnected]
 * @returns {Promise<string>}
 */
export const encryptJWT = async (payload: SessionData, stayConnected?: boolean) => {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: jwtAlg })
    .setIssuedAt()

  if (!stayConnected) {
    jwt.setExpirationTime(`${env.JWT_EXPIRE_AT} seconds`)
  }

  return jwt.sign(jwtSecret)
}

/**
 * Verify the JWT format, verify the JWS signature, validate the JWT Claims Set.
 *
 * @async
 * @param {string} input
 * @returns {Promise<SessionData>}
 */
export const decryptJWT = async (input: string) => {
  const { payload } = await jwtVerify(input, jwtSecret, {
    algorithms: [jwtAlg],
  })
  return payload as SessionData
}

/**
 * Check whether the request is from the admin or not.
 *
 * @export
 * @param {Request} req
 * @returns {boolean}
 */
export const isAdmin = (req: Request): boolean => !!req.headers.origin && helper.trimEnd(req.headers.origin, '/') === helper.trimEnd(env.ADMIN_HOST, '/')

/**
 * Check whether the request is from the frontend or not.
 *
 * @export
 * @param {Request} req
 * @returns {boolean}
 */
export const isFrontend = (req: Request): boolean => !!req.headers.origin && helper.trimEnd(req.headers.origin, '/') === helper.trimEnd(env.FRONTEND_HOST, '/')

/**
 * Get authentification cookie name.
 *
 * @param {Request} req
 * @returns {string}
 */
export const getAuthCookieName = (req: Request): string => {
  if (isAdmin(req)) {
    // Admin auth cookie name
    return env.ADMIN_AUTH_COOKIE_NAME
  }

  if (isFrontend(req)) {
    // Frontend auth cookie name
    return env.FRONTEND_AUTH_COOKIE_NAME
  }

  // Mobile app and unit tests auth header name
  return env.X_ACCESS_TOKEN
}
