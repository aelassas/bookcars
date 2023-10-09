import fs from 'node:fs/promises'
import path from 'node:path'
import { Request } from 'express'
import * as env from '../config/env.config'

/**
 * Convert string to boolean.
 *
 * @export
 * @param {string} input
 * @returns {boolean}
 */
export function StringToBoolean(input: string): boolean {
    try {
        return Boolean(JSON.parse(input.toLowerCase()))
    } catch {
        return false
    }
}

/**
 * Check if a file exists.
 *
 * @export
 * @async
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
export async function exists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

/**
 * Removes a leading and trailing line terminator character from a string.
 *
 * @export
 * @param {string} str
 * @param {string} char
 * @returns {string}
 */
export function trim(str: string, char: string): string {
    let res = str
    while (res.charAt(res.length - 1) === char) {
        res = res.substring(0, res.length - 1)
    }
    return res
}

/**
 * Join two url parts.
 *
 * @export
 * @param {string} part1
 * @param {string} part2
 * @returns {string}
 */
export function joinURL(part1: string, part2: string): string {
    const p1 = trim(part1, '/')
    let p2 = part2

    if (part2.charAt(0) === '/') {
        p2 = part2.substring(1)
    }

    return `${p1}/${p2}`
}

/**
 * Get filename without extension.
 *
 * @export
 * @param {string} filename
 * @returns {string}
 */
export function getFilenameWithoutExtension(filename: string): string {
    return path.parse(filename).name
}

/**
 * Clone an object or an array.
 *
 * @param {*} obj
 * @returns {*}
 */
export const clone = (obj: any) => (Array.isArray(obj) ? Array.from(obj) : ({ ...obj }))

/**
 * Check whether the request is from the backend or not.
 *
 * @export
 * @param {Request} req
 * @returns {boolean}
 */
export function isBackend(req: Request): boolean {
    return req.headers.origin === trim(env.BACKEND_HOST, '/')
}

/**
 * Check whether the request is from the frontend or not.
 *
 * @export
 * @param {Request} req
 * @returns {boolean}
 */
export function isFrontend(req: Request): boolean {
    return req.headers.origin === trim(env.FRONTEND_HOST, '/')
}

/**
 * Get authentification cookie name.
 *
 * @param {?boolean} backend
 * @returns {string}
 */
export const getAuthCookieName = (req: Request): string => (isBackend(req) ? env.BACKEND_AUTH_COOKIE_NAME : env.FRONTEND_AUTH_COOKIE_NAME)
