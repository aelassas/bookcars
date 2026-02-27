import type { Request, Response, NextFunction } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as helper from '../utils/helper'
import * as authHelper from '../utils/authHelper'
import * as logger from '../utils/logger'
import User from '../models/User'

// Extend Express Request interface to include user property
declare module 'express-serve-static-core' {
  interface Request {
    user?: { _id: string, type: bookcarsTypes.UserType }
  }
}

/**
 * Verify authentication token middleware.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Get token from cookies or headers
  let token: string
  const isAdmin = authHelper.isAdmin(req)
  const isFrontend = authHelper.isFrontend(req)

  if (isAdmin) {
    token = req.signedCookies[env.ADMIN_AUTH_COOKIE_NAME] as string // admin
  } else if (isFrontend) {
    token = req.signedCookies[env.FRONTEND_AUTH_COOKIE_NAME] as string // frontend
  } else {
    token = req.headers[env.X_ACCESS_TOKEN] as string // mobile app and unit tests
  }

  if (!token) {
    res.status(403).send({ message: 'No token provided!' })
    return
  }

  try {
    // 2. Decrypt and verify the token
    const sessionData = await authHelper.decryptJWT(token)

    if (!sessionData || !helper.isValidObjectId(sessionData.id)) {
      res.status(401).send({ message: 'Unauthorized!' })
      return
    }

    // 3. Fetch the user and attach to the request object
    const user = await User.findById(sessionData.id)

    if (!user || user.blacklisted) {
      res.status(401).send({ message: 'Unauthorized!' })
      return
    }

    // 4. Attach user to request for use in the next middleware/controller
    req.user = { _id: user._id.toString(), type: user.type as bookcarsTypes.UserType }
    next()
  } catch (err) {
    logger.info('Token verification failed', err)
    res.status(401).send({ message: 'Unauthorized!' })
  }
}

/**
 * Auth for Admin only.
 *
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
const authAdmin = (req: Request, res: Response, next: NextFunction) => {
  const { user } = req
  if (user && user.type === bookcarsTypes.UserType.Admin) {
    next()
  } else {
    res.status(403).send({ message: 'Require Admin Role!' })
  }
}

/**
 * Auth for Admin and Supplier.
 *
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
const authSupplier = (req: Request, res: Response, next: NextFunction) => {
  const { user } = req
  if (user && (user.type === bookcarsTypes.UserType.Admin || user.type === bookcarsTypes.UserType.Supplier)) {
    next()
  } else {
    res.status(403).send({ message: 'Require Supplier or Admin Role!' })
  }
}

export default { verifyToken, authAdmin, authSupplier }
