import { Request, Response, NextFunction } from 'express'
import * as env from '../config/env.config'
import * as helper from '../common/helper'
import * as authHelper from '../common/authHelper'
import * as logger from '../common/logger'
import User from '../models/User'

/**
 * Verify authentication token middleware.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  let token: string

  if (authHelper.isBackend(req)) {
    token = req.signedCookies[env.BACKEND_AUTH_COOKIE_NAME] as string // backend
  } else if (authHelper.isFrontend(req)) {
    token = req.signedCookies[env.FRONTEND_AUTH_COOKIE_NAME] as string // frontend
  } else {
    token = req.headers[env.X_ACCESS_TOKEN] as string // mobile app and unit tests
  }

  if (token) {
    // Check token
    try {
      const sessionData = await authHelper.decryptJWT(token)

      if (
        !sessionData
        || !helper.isValidObjectId(sessionData.id)
        || !(await User.exists({ _id: sessionData.id, blacklisted: false }))
      ) {
        // Token not valid!
        logger.info('Token not valid: User not found')
        res.status(401).send({ message: 'Unauthorized!' })
      } else {
        // Token valid!
        next()
      }
    } catch (err) {
      // Token not valid!
      logger.info('Token not valid', err)
      res.status(401).send({ message: 'Unauthorized!' })
    }
  } else {
    // Token not found!
    res.status(403).send({ message: 'No token provided!' })
  }
}

export default { verifyToken }
