export function formatNumber(x?: number): string {
    if (typeof x === 'number') {
        const parts: string[] = String(x).split('.')
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
        return parts.join('.')
    }
    return ''
}

export function formatDatePart(n: number): string {
    return n > 9 ? String(n) : '0' + n
}

export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

export function isDate(date?: Date): boolean {
    return date instanceof Date && !isNaN(date.valueOf())
}

export const joinURL = (part1?: string, part2?: string) => {
    if (!part1 || !part2) {
        const msg = '[joinURL] part undefined'
        console.log(msg)
        throw new Error(msg)
    }

    if (part1.charAt(part1.length - 1) === '/') {
        part1 = part1.substring(0, part1.length - 1)
    }
    if (part2.charAt(0) === '/') {
        part2 = part2.substring(1)
    }
    return part1 + '/' + part2
}

export const isInteger = (val: string) => {
    return /^\d+$/.test(val)
}

export const isYear = (val: string) => {
    return /^\d{2}$/.test(val)
}

export const isCvv = (val: string) => {
    return /^\d{3,4}$/.test(val)
}
