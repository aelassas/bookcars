import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import * as env from '../config/env.config'
import * as Helper from '../common/Helper'

/**
 * Verify authentication token middleware.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
function verifyToken(req: Request, res: Response, next: NextFunction) {
  let token: string

  if (Helper.isBackend(req)) {
    token = req.signedCookies[env.BACKEND_AUTH_COOKIE_NAME] as string // backend
  } else if (Helper.isFrontend(req)) {
    token = req.signedCookies[env.FRONTEND_AUTH_COOKIE_NAME] as string // frontend
  } else {
    token = req.headers[env.X_ACCESS_TOKEN] as string // mobile app and unit tests
  }

  if (token) {
    // Check token
    jwt.verify(token, env.JWT_SECRET, (err) => {
      if (err) {
        console.log(err)
        res.status(401).send({ message: 'Unauthorized!' })
      } else {
        next()
      }
    })
  } else {
    // Token not found!
    res.status(403).send({ message: 'No token provided!' })
  }
}

export default { verifyToken }
