import fs from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import validator from 'validator'
import { v1 as uuid } from 'uuid'

/**
 * Convert string to boolean.
 *
 * @export
 * @param {string} input
 * @returns {boolean}
 */
export const StringToBoolean = (input: string): boolean => {
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
export const exists = async (filePath: string): Promise<boolean> => {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

/**
 * Create a folder recursively.
 *
 * @export
 * @async
 * @param {string} folder
 * @param {boolean} recursive
 * @returns {Promise<void>}
 */
export const mkdir = async (folder: string) => {
    await fs.mkdir(folder, { recursive: true })
}

/**
 * Removes a leading and trailing line terminator character from a string.
 *
 * @export
 * @param {string} str
 * @param {string} char
 * @returns {string}
 */
export const trim = (str: string, char: string): string => {
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
export const joinURL = (part1: string, part2: string): string => {
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
export const getFilenameWithoutExtension = (filename: string): string => path.parse(filename).name

/**
 * Clone an object or an array.
 *
 * @param {*} obj
 * @returns {*}
 */
export const clone = (obj: any) => (Array.isArray(obj) ? Array.from(obj) : ({ ...obj }))

/**
 * Check ObjectId.
 *
 * @param {?string} id
 * @returns {boolean}
 */
export const isValidObjectId = (id?: string) => mongoose.isValidObjectId(id)

/**
 * Check email.
 *
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email?: string) => !!email && validator.isEmail(email)

/**
 * Generate user token.
 *
 * @returns {string}
 */
export const generateToken = () => `${uuid()}-${Date.now()}`
