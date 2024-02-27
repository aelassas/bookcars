import * as bookcarsTypes from 'bookcars-types';
/**
 * Format a number.
 *
 * @export
 * @param {?number} [x]
 * @returns {string}
 */
export declare const formatNumber: (x?: number) => string;
/**
 * Format a Date number to two digits.
 *
 * @export
 * @param {number} n
 * @returns {string}
 */
export declare const formatDatePart: (n: number) => string;
/**
 * Capitalize a string.
 *
 * @export
 * @param {string} str
 * @returns {string}
 */
export declare const capitalize: (str: string) => string;
/**
 * Check if a value is a Date.
 *
 * @export
 * @param {?*} [value]
 * @returns {boolean}
 */
export declare const isDate: (value?: any) => boolean;
/**
 * Join two url parts.
 *
 * @param {?string} [part1]
 * @param {?string} [part2]
 * @returns {string}
 */
export declare const joinURL: (part1?: string, part2?: string) => string;
/**
 * Check if a string is an integer.
 *
 * @param {string} val
 * @returns {boolean}
 */
export declare const isInteger: (val: string) => boolean;
/**
 * Check if a string is a year.
 *
 * @param {string} val
 * @returns {boolean}
 */
export declare const isYear: (val: string) => boolean;
/**
 * Check if a string is a CVV.
 *
 * @param {string} val
 * @returns {boolean}
 */
export declare const isCvv: (val: string) => boolean;
/**
 * Check if two arrays are equal.
 *
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
export declare const arrayEqual: (a: any, b: any) => boolean;
/**
 * Clone an object or array.
 *
 * @param {*} obj
 * @returns {*}
 */
export declare const clone: (obj: any) => any;
/**
 * Clone an array.
 *
 * @export
 * @template T
 * @param {T[]} arr
 * @returns {(T[] | undefined | null)}
 */
export declare const cloneArray: <T>(arr: T[]) => T[] | null | undefined;
/**
 * Check if two filters are equal.
 *
 * @param {?(bookcarsTypes.Filter | null)} [a]
 * @param {?(bookcarsTypes.Filter | null)} [b]
 * @returns {boolean}
 */
export declare const filterEqual: (a?: bookcarsTypes.Filter | null, b?: bookcarsTypes.Filter | null) => boolean;
/**
 * Flatten Supplier array.
 *
 * @param {bookcarsTypes.User[]} companies
 * @returns {string[]}
 */
export declare const flattenCompanies: (companies: bookcarsTypes.User[]) => string[];
/**
 * Get number of days between two dates.
 *
 * @param {?Date} [from]
 * @param {?Date} [to]
 * @returns {number}
 */
export declare const days: (from?: Date, to?: Date) => number;
