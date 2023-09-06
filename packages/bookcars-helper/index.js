export function formatNumber(x) {
    if (typeof x === 'number') {
        const parts = String(x).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return parts.join('.');
    }
    return '';
}
export function formatDatePart(n) {
    return n > 9 ? String(n) : '0' + n;
}
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
export function isDate(date) {
    return date instanceof Date && !isNaN(date.valueOf());
}
export const joinURL = (part1, part2) => {
    if (!part1 || !part2) {
        const msg = '[joinURL] part undefined';
        console.log(msg);
        throw new Error(msg);
    }
    if (part1.charAt(part1.length - 1) === '/') {
        part1 = part1.substring(0, part1.length - 1);
    }
    if (part2.charAt(0) === '/') {
        part2 = part2.substring(1);
    }
    return part1 + '/' + part2;
};
export const isInteger = (val) => {
    return /^\d+$/.test(val);
};
export const isYear = (val) => {
    return /^\d{2}$/.test(val);
};
export const isCvv = (val) => {
    return /^\d{3,4}$/.test(val);
};
