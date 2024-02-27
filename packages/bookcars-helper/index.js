/**
 * Format a number.
 *
 * @export
 * @param {?number} [x]
 * @returns {string}
 */
export const formatNumber = (x) => {
    if (typeof x === 'number') {
        const parts = String(x % 1 !== 0 ? x.toFixed(2) : x).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return parts.join('.');
    }
    return '';
};
/**
 * Format a Date number to two digits.
 *
 * @export
 * @param {number} n
 * @returns {string}
 */
export const formatDatePart = (n) => {
    return n > 9 ? String(n) : '0' + n;
};
/**
 * Capitalize a string.
 *
 * @export
 * @param {string} str
 * @returns {string}
 */
export const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
/**
 * Check if a value is a Date.
 *
 * @export
 * @param {?*} [value]
 * @returns {boolean}
 */
export const isDate = (value) => {
    return value instanceof Date && !Number.isNaN(value.valueOf());
};
/**
 * Join two url parts.
 *
 * @param {?string} [part1]
 * @param {?string} [part2]
 * @returns {string}
 */
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
/**
 * Check if a string is an integer.
 *
 * @param {string} val
 * @returns {boolean}
 */
export const isInteger = (val) => {
    return /^\d+$/.test(val);
};
/**
 * Check if a string is a year.
 *
 * @param {string} val
 * @returns {boolean}
 */
export const isYear = (val) => {
    return /^\d{2}$/.test(val);
};
/**
 * Check if a string is a CVV.
 *
 * @param {string} val
 * @returns {boolean}
 */
export const isCvv = (val) => {
    return /^\d{3,4}$/.test(val);
};
/**
 * Check if two arrays are equal.
 *
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
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
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
};
/**
 * Clone an object or array.
 *
 * @param {*} obj
 * @returns {*}
 */
export const clone = (obj) => {
    return Array.isArray(obj) ? Array.from(obj) : Object.assign({}, obj);
};
/**
 * Clone an array.
 *
 * @export
 * @template T
 * @param {T[]} arr
 * @returns {(T[] | undefined | null)}
 */
export const cloneArray = (arr) => {
    if (typeof arr === 'undefined') {
        return undefined;
    }
    if (arr == null) {
        return null;
    }
    return [...arr];
};
/**
 * Check if two filters are equal.
 *
 * @param {?(bookcarsTypes.Filter | null)} [a]
 * @param {?(bookcarsTypes.Filter | null)} [b]
 * @returns {boolean}
 */
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
/**
 * Flatten Supplier array.
 *
 * @param {bookcarsTypes.User[]} companies
 * @returns {string[]}
 */
export const flattenCompanies = (companies) => companies.map((company) => company._id ?? '');
/**
 * Get number of days between two dates.
 *
 * @param {?Date} [from]
 * @param {?Date} [to]
 * @returns {number}
 */
export const days = (from, to) => (from && to && Math.ceil((to.getTime() - from.getTime()) / (1000 * 3600 * 24))) || 0;
