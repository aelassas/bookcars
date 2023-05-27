import jwt from 'jsonwebtoken'
import {Request, Response, NextFunction} from "express";

const JWT_SECRET = process.env.BC_JWT_SECRET

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const token = String(req.headers['x-access-token'])

    if (!token) {
        return res.status(403).send({ message: 'No token provided!' })
    }

    jwt.verify(token, JWT_SECRET, (err: unknown, decoded) => {
        if (err) {
            console.log(err)
            return res.status(401).send({ message: 'Unauthorized!' })
        }

        if(decoded && typeof decoded === 'object' && 'id' in decoded && typeof decoded.id === 'string') {
            req.userId = decoded.id
        }
        next()
    })
}

export default { verifyToken }
