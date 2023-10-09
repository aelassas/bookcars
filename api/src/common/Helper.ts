import fs from 'node:fs/promises'
import path from 'node:path'
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
 * Join two url parts.
 *
 * @export
 * @param {string} part1
 * @param {string} part2
 * @returns {string}
 */
export function joinURL(part1: string, part2: string): string {
    let p1 = part1
    if (part1.charAt(part1.length - 1) === '/') {
        p1 = part1.substring(0, part1.length - 1)
    }

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
 * Get authentification cookie name.
 *
 * @param {?boolean} backend
 * @returns {string}
 */
export const getAuthCookieName = (backend?: boolean): string => (backend ? env.BACKEND_AUTH_COOKIE_NAME : env.FRONTEND_AUTH_COOKIE_NAME)
