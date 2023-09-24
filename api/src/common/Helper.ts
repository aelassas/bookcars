import fs from 'node:fs/promises'
import path from 'node:path'

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
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function exists(path: string): Promise<boolean> {
    try {
        await fs.access(path)
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
    if (part1.charAt(part1.length - 1) === '/') {
        part1 = part1.substring(0, part1.length - 1)
    }

    if (part2.charAt(0) === '/') {
        part2 = part2.substring(1)
    }

    return `${part1}/${part2}`
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
