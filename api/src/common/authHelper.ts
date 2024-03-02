import { Request } from 'express'
import * as helper from './helper'
import * as env from '../config/env.config'

/**
 * Check whether the request is from the backend or not.
 *
 * @export
 * @param {Request} req
 * @returns {boolean}
 */
export const isBackend = (req: Request): boolean => !!req.headers.origin && helper.trim(req.headers.origin, '/') === helper.trim(env.BACKEND_HOST, '/')

/**
 * Check whether the request is from the frontend or not.
 *
 * @export
 * @param {Request} req
 * @returns {boolean}
 */
export const isFrontend = (req: Request): boolean => !!req.headers.origin && helper.trim(req.headers.origin, '/') === helper.trim(env.FRONTEND_HOST, '/')

/**
 * Get authentification cookie name.
 *
 * @param {Request} req
 * @returns {string}
 */
export const getAuthCookieName = (req: Request): string => {
    if (isBackend(req)) {
        // Backend auth cookie name
        return env.BACKEND_AUTH_COOKIE_NAME
    }

    if (isFrontend(req)) {
        // Frontend auth cookie name
        return env.FRONTEND_AUTH_COOKIE_NAME
    }

    // Mobile app and unit tests auth header name
    return env.X_ACCESS_TOKEN
}
