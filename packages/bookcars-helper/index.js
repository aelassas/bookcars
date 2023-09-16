export function formatNumber(x) {
    if (typeof x === 'number') {
        const parts = String(x % 1 !== 0 ? x.toFixed(2) : x).split('.');
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
export const arrayEqual = (a, b) => {
    if (a === b) {
        return true;
    }
    if (a == null || b == null) {
        return false;
    }
    if (a.length !== b.length) {
        return false;
    }
    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};
export const clone = (obj) => {
    return Array.isArray(obj) ? Array.from(obj) : Object.assign({}, obj);
};
export function cloneArray(arr) {
    if (typeof arr === 'undefined') {
        return undefined;
    }
    if (arr == null) {
        return null;
    }
    return [...arr];
}
export const filterEqual = (a, b) => {
    if (a === b) {
        return true;
    }
    if (a == null || b == null) {
        return false;
    }
    if (a.from !== b.from) {
        return false;
    }
    if (a.to !== b.to) {
        return false;
    }
    if (a.pickupLocation !== b.pickupLocation) {
        return false;
    }
    if (a.dropOffLocation !== b.dropOffLocation) {
        return false;
    }
    if (a.keyword !== b.keyword) {
        return false;
    }
    return true;
};
export const flattenCompanies = (companies) => companies.map((company) => company._id ?? '');
export const days = (from, to) => (from && to && Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24))) || 0;
