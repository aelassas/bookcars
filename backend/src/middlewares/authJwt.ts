import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as helper from '../utils/helper'
import * as authHelper from '../utils/authHelper'
import * as logger from '../utils/logger'
import User from '../models/User'

/**
 * Verify authentication token middleware.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined
  const isAdmin = authHelper.isAdmin(req)
  const isFrontend = authHelper.isFrontend(req)

  // Debug logging
  logger.info(`[authJwt] DEBUG - Origin: ${req.headers.origin}`)
  logger.info(`[authJwt] DEBUG - isAdmin: ${isAdmin}`)
  logger.info(`[authJwt] DEBUG - isFrontend: ${isFrontend}`)
  logger.info(`[authJwt] DEBUG - ADMIN_HOST: ${env.ADMIN_HOST}`)
  logger.info(`[authJwt] DEBUG - FRONTEND_HOST: ${env.FRONTEND_HOST}`)
  logger.info(`[authJwt] DEBUG - Signed cookies: ${JSON.stringify(Object.keys(req.signedCookies || {}))}`)
  logger.info(`[authJwt] DEBUG - Regular cookies: ${JSON.stringify(Object.keys(req.cookies || {}))}`)
  logger.info(`[authJwt] DEBUG - Admin cookie value (signed): ${req.signedCookies[env.ADMIN_AUTH_COOKIE_NAME] ? 'present' : 'missing'}`)
  logger.info(`[authJwt] DEBUG - Admin cookie value (regular): ${req.cookies[env.ADMIN_AUTH_COOKIE_NAME] ? 'present' : 'missing'}`)
  if (req.cookies[env.ADMIN_AUTH_COOKIE_NAME]) {
    logger.info(`[authJwt] DEBUG - Admin cookie raw value: ${String(req.cookies[env.ADMIN_AUTH_COOKIE_NAME]).substring(0, 50)}...`)
  }

  // Check for cookies - prioritize by origin first, then fallback to any available cookie
  // Check both signed cookies (preferred) and regular cookies (fallback for compatibility)
  let adminToken = req.signedCookies[env.ADMIN_AUTH_COOKIE_NAME] as string
  let frontendToken = req.signedCookies[env.FRONTEND_AUTH_COOKIE_NAME] as string

  // If signed cookies are not available, check regular cookies
  // This handles cases where cookie signature doesn't match (e.g., different COOKIE_SECRET)
  // Signed cookies from cookie-parser have format: s:value.signature
  // If signature doesn't match, the raw value (with s:) ends up in req.cookies
  if (!adminToken) {
    const rawAdminToken = req.cookies[env.ADMIN_AUTH_COOKIE_NAME] as string
    if (rawAdminToken) {
      logger.info(`[authJwt] DEBUG - Found admin token in regular cookies, length: ${rawAdminToken.length}, starts with s:: ${rawAdminToken.startsWith('s:')}`)
      // If cookie starts with 's:', it's a signed cookie that failed verification
      // The format is s:jwt.cookieSignature where jwt is the actual JWT token
      // JWT tokens have 3 parts separated by '.', so we need to extract the JWT part
      if (rawAdminToken.startsWith('s:')) {
        const withoutPrefix = rawAdminToken.substring(2) // Remove 's:' prefix
        // JWT format: header.payload.signature (3 parts)
        // Cookie-parser adds its own signature: jwt.cookieSignature
        // So we need to find where the JWT ends (after 2 dots from the start of JWT)
        const jwtParts = withoutPrefix.split('.')
        logger.info(`[authJwt] DEBUG - JWT parts count: ${jwtParts.length}`)
        // JWT has exactly 3 parts, so if we have more than 3, the last part is cookie-parser's signature
        if (jwtParts.length >= 3) {
          // Take first 3 parts as the JWT (header.payload.signature)
          adminToken = jwtParts.slice(0, 3).join('.')
          logger.info(`[authJwt] DEBUG - Extracted JWT token (length: ${adminToken.length})`)
        } else {
          // Fallback: use everything (might not be a valid JWT)
          adminToken = withoutPrefix
          logger.info(`[authJwt] DEBUG - Using full token without prefix (length: ${adminToken.length})`)
        }
      } else {
        // Not a signed cookie, use as-is
        adminToken = rawAdminToken
        logger.info(`[authJwt] DEBUG - Using token as-is (not signed cookie format)`)
      }
    } else {
      logger.info(`[authJwt] DEBUG - No admin token found in regular cookies`)
    }
  }

  if (!frontendToken) {
    const rawFrontendToken = req.cookies[env.FRONTEND_AUTH_COOKIE_NAME] as string
    if (rawFrontendToken) {
      if (rawFrontendToken.startsWith('s:')) {
        const withoutPrefix = rawFrontendToken.substring(2)
        const jwtParts = withoutPrefix.split('.')
        if (jwtParts.length >= 3) {
          frontendToken = jwtParts.slice(0, 3).join('.')
        } else {
          frontendToken = withoutPrefix
        }
      } else {
        frontendToken = rawFrontendToken
      }
    }
  }

  logger.info(`[authJwt] DEBUG - Admin token after extraction: ${adminToken ? 'found' : 'not found'}`)
  logger.info(`[authJwt] DEBUG - Frontend token after extraction: ${frontendToken ? 'found' : 'not found'}`)

  // Determine which token to use and what type of request this is
  let tokenType: 'admin' | 'frontend' | 'mobile' = 'mobile'

  // Prioritize origin-based detection first
  // If both isAdmin and isFrontend are true (same host), prioritize frontend for customer access
  if (isFrontend && !isAdmin) {
    // Request is from frontend only, prefer frontend token, but fallback to admin token if frontend token doesn't exist
    if (frontendToken) {
      token = frontendToken
      tokenType = 'frontend'
      logger.info(`[authJwt] DEBUG - Frontend origin detected, using frontend token: ${!!token}`)
    } else if (adminToken) {
      // Frontend request with admin cookie - allow all user types
      token = adminToken
      tokenType = 'frontend' // Treat as frontend request even though using admin cookie
      logger.info(`[authJwt] DEBUG - Frontend origin detected, using admin token as fallback: ${!!token}`)
    }
  } else if (isAdmin && !isFrontend) {
    // Request is from admin only, use admin token
    token = adminToken
    tokenType = 'admin'
    logger.info(`[authJwt] DEBUG - Admin origin detected, using admin token: ${!!token}`)
  } else if (isAdmin && isFrontend) {
    // Both admin and frontend hosts are the same (e.g., localhost:3002)
    // Check if we have a frontend token - if yes, treat as frontend (customer access)
    // Otherwise, check if we have admin token - if yes, check user type
    if (frontendToken) {
      token = frontendToken
      tokenType = 'frontend'
      logger.info(`[authJwt] DEBUG - Same host (admin=frontend), using frontend token: ${!!token}`)
    } else if (adminToken) {
      // Use admin token but treat as frontend request to allow all user types
      token = adminToken
      tokenType = 'frontend' // Treat as frontend to allow customer access
      logger.info(`[authJwt] DEBUG - Same host (admin=frontend), using admin token as frontend: ${!!token}`)
    }
  } else if (adminToken) {
    // No origin match, but admin token exists (fallback)
    token = adminToken
    tokenType = 'admin'
    logger.info(`[authJwt] DEBUG - No origin match, using admin token as fallback: ${!!token}`)
  } else if (frontendToken) {
    // No origin match, but frontend token exists (fallback)
    token = frontendToken
    tokenType = 'frontend'
    logger.info(`[authJwt] DEBUG - No origin match, using frontend token as fallback: ${!!token}`)
  } else {
    // Mobile app and unit tests
    token = req.headers[env.X_ACCESS_TOKEN] as string
    tokenType = 'mobile'
    logger.info(`[authJwt] DEBUG - Mobile token found: ${!!token}`)
  }

  if (token) {
    // Check token
    try {
      logger.info(`[authJwt] DEBUG - Attempting to decrypt token (length: ${token.length})`)
      const sessionData = await authHelper.decryptJWT(token)
      logger.info(`[authJwt] DEBUG - Token decrypted successfully, user ID: ${sessionData?.id}`)

      const $match: mongoose.FilterQuery<bookcarsTypes.User> = {
        $and: [
          { _id: sessionData?.id },
          // { blacklisted: false },
        ],
      }

      // Apply user type restrictions based on tokenType, not origin
      // This ensures proper access control while allowing flexibility
      // When both admin and frontend hosts are the same, tokenType determines the behavior
      if (tokenType === 'admin' && !isFrontend) {
        // Admin token from admin-only origin: Only allow Admin and Supplier types
        $match.$and?.push({ type: { $in: [bookcarsTypes.UserType.Admin, bookcarsTypes.UserType.Supplier] } })
        logger.info(`[authJwt] DEBUG - Admin token from admin-only origin: restricting to Admin/Supplier types`)
      } else {
        // Frontend token or admin token used as frontend: Allow all user types
        // This handles:
        // 1. Frontend requests (customers)
        // 2. Admin token used from frontend origin (customer registration flow)
        // 3. Same host scenario (localhost:3002) where we want customer access
        logger.info(`[authJwt] DEBUG - Frontend token or admin token as frontend: allowing all user types`)
      }

      const userExists = await User.exists($match)
      logger.info(`[authJwt] DEBUG - User exists check: ${userExists}`)
      logger.info(`[authJwt] DEBUG - Match query: ${JSON.stringify($match)}`)

      if (
        !sessionData
        || !helper.isValidObjectId(sessionData.id)
        || !userExists
      ) {
        // Token not valid!
        logger.info(`[authJwt] Token not valid: sessionData=${!!sessionData}, validId=${sessionData ? helper.isValidObjectId(sessionData.id) : false}, userExists=${userExists}`)
        res.status(401).send({ message: 'Unauthorized!' })
      } else {
        // Token valid!
        logger.info(`[authJwt] Token validated successfully`)
        next()
      }
    } catch (err) {
      // Token not valid!
      logger.info('Token not valid', err)
      logger.error(`[authJwt] Error decrypting token:`, err)
      res.status(401).send({ message: 'Unauthorized!' })
    }
  } else {
    // Token not found!
    logger.info(`[authJwt] No token found - adminToken: ${!!adminToken}, frontendToken: ${!!frontendToken}`)
    res.status(403).send({ message: 'No token provided!' })
  }
}

export default { verifyToken }
