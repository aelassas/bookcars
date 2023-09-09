import fs from 'node:fs/promises'

export function StringToBoolean(input: string): boolean {
    try {
        return Boolean(JSON.parse(input.toLowerCase()))
    } catch {
        return false
    }
}

export async function exists(path: string): Promise<boolean> {
    try {
        await fs.access(path)
        return true
    } catch {
        return false
    }
}

export function joinURL(part1: string, part2: string): string {
    if (part1.charAt(part1.length - 1) === '/') {
        part1 = part1.substring(0, part1.length - 1)
    }

    if (part2.charAt(0) === '/') {
        part2 = part2.substring(1)
    }

    return `${part1}/${part2}`
}
