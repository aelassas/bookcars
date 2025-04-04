import { NextFunction, Request, Response } from 'express'

/**
 * Allowed methods.
 *
 * @type {string[]}
 */
const ALLOWED_METHODS = ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE']

/**
 * Allowed methods middleware.
 * Do not allow TRACE method to prevent XST attacks.
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {*}
 */
export default (req: Request, res: Response, next: NextFunction) => {
    if (!ALLOWED_METHODS.includes(req.method)) {
        res
            .status(405)
            .send('Method Not Allowed')
    }
    next()
}
