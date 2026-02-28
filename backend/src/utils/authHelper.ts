import { Request } from 'express'
import axios from 'axios'
import * as jose from 'jose'
import bcrypt from 'bcrypt'
import { OAuth2Client } from 'google-auth-library'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from './helper'
import * as env from '../config/env.config'
import * as logger from '../utils/logger'

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
  const jwt = await new jose.SignJWT(payload)
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
  const { payload } = await jose.jwtVerify(input, jwtSecret, {
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

/**
 * Hash password using bcrypt.
 *
 * @async
 * @param {string} password 
 * @returns {Promise<string>} 
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

/**
 * Validate Access token structure.
 *
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export const validateAccessToken = async (
  socialSignInType: bookcarsTypes.SocialSignInType,
  token: string,
  email: string
): Promise<boolean> => {
  if (!token) {
    return false
  }

  try {
    switch (socialSignInType) {
      case bookcarsTypes.SocialSignInType.Apple:
        return await verifyAppleToken(token, email)

      case bookcarsTypes.SocialSignInType.Google:
        return await verifyGoogleToken(token, email)

      case bookcarsTypes.SocialSignInType.Facebook:
        return await verifyFacebookToken(token, email)

      default:
        return false
    }
  } catch (err: any) {
    // Log the error but don't leak details to the client
    logger.error(`[Security] Auth validation failed for ${socialSignInType}:`, err.message)
    return false
  }
}

// Cache JWKS for performance
const APPLE_JWKS = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))

/**
 * APPLE: Always a JWT
 */
export async function verifyAppleToken(token: string, email: string): Promise<boolean> {
  try {
    const { payload } = await jose.jwtVerify(token, APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: env.APPLE_CLIENT_ID,
      clockTolerance: '2m' // 2-minute grace period
    })

    const emailMatches = typeof payload.email === 'string' && payload.email && payload.email.toLowerCase() === email.toLowerCase()
    const isVerified = payload.email_verified === true || payload.email_verified === 'true'

    return Boolean(payload.sub && emailMatches && isVerified)
  } catch {
    return false
  }
}

// Cache OAuth2Client for performance
const client = new OAuth2Client()

/**
 * GOOGLE: Handles ID Tokens (JWT) or Access Tokens (Opaque)
 */
export async function verifyGoogleToken(token: string, email: string): Promise<boolean> {
  const allowedClientIds = [
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_MOBILE_CLIENT_ID,
  ]

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: allowedClientIds,
  })

  const payload = ticket.getPayload()
  if (!payload) {
    return false
  }

  const emailMatches = payload.email?.toLowerCase() === email.toLowerCase()

  return emailMatches
}

/**
 * FACEBOOK: Handles Opaque Access Tokens
 */
export async function verifyFacebookToken(token: string, email: string): Promise<boolean> {
  // Use the Graph API (Standard Opaque Token)
  const appToken = `${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`

  const debugRes = await axios.get('https://graph.facebook.com/debug_token', {
    params: {
      input_token: token,
      access_token: appToken
    }
  })

  if (!debugRes.data.data.is_valid || debugRes.data.data.app_id !== env.FACEBOOK_APP_ID) {
    return false
  }

  const userRes = await axios.get('https://graph.facebook.com/me', {
    params: { fields: 'email', access_token: token }
  })

  const emailMatches = userRes.data.email?.toLowerCase() === email.toLowerCase()

  return emailMatches
}
