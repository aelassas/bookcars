import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
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
  const isBackend = authHelper.isBackend(req)
  const isFrontend = authHelper.isFrontend(req)

  if (isBackend) {
    token = req.signedCookies[env.BACKEND_AUTH_COOKIE_NAME] as string // backend
  } else if (isFrontend) {
    token = req.signedCookies[env.FRONTEND_AUTH_COOKIE_NAME] as string // frontend
  } else {
    token = req.headers[env.X_ACCESS_TOKEN] as string // mobile app and unit tests
  }

  if (token) {
    // Check token
    try {
      const sessionData = await authHelper.decryptJWT(token)
      const $match: mongoose.FilterQuery<bookcarsTypes.User> = {
        $and: [
          { _id: sessionData?.id },
          // { blacklisted: false },
        ],
      }

      if (isBackend) {
        $match.$and?.push({ type: { $in: [bookcarsTypes.UserType.Admin, bookcarsTypes.UserType.Supplier] } })
      } else if (isFrontend) {
        $match.$and?.push({ type: bookcarsTypes.UserType.User })
      }

      if (
        !sessionData
        || !helper.isValidObjectId(sessionData.id)
        || !(await User.exists($match))
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
