export function formatNumber(x: number): string {
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

export function isDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.valueOf())
}
