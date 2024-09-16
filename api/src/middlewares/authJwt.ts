import { Request, Response, NextFunction } from 'express'
import * as env from '../config/env.config'
import * as authHelper from '../common/authHelper'
import * as logger from '../common/logger'

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
      await authHelper.decryptJWT(token)
      // Token valid!
      next()
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
