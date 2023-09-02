import { Request, Response, NextFunction } from 'express'
import process from 'node:process'
import jwt from 'jsonwebtoken'

const JWT_SECRET = String(process.env.BC_JWT_SECRET)

function verifyToken(req: Request, res: Response, next: NextFunction) {
  const token: string = req.headers['x-access-token'] as string

  if (!token) {
    return res.status(403).send({ message: 'No token provided!' })
  }

  return jwt.verify(token, JWT_SECRET, (err) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'Unauthorized!' })
    }

    return next()
  })
}

export default { verifyToken }
