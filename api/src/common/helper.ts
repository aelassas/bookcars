import { constants } from 'node:fs'
import asyncFs from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import validator from 'validator'
import Stripe from 'stripe'
import { nanoid } from 'nanoid'
import axios from 'axios'
import * as bookcarsTypes from ':bookcars-types'

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
 * Check if a file or a folder exists.
 *
 * @export
 * @async
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
export const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await asyncFs.access(filePath, constants.F_OK)
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
  await asyncFs.mkdir(folder, { recursive: true })
}

/**
 * Removes a start line terminator character from a string.
 *
 * @export
 * @param {string} str
 * @param {string} char
 * @returns {string}
 */
export const trimStart = (str: string, char: string): string => {
  let res = str
  while (res.charAt(0) === char) {
    res = res.substring(1, res.length)
  }
  return res
}

/**
 * Removes a leading and trailing line terminator character from a string.
 *
 * @export
 * @param {string} str
 * @param {string} char
 * @returns {string}
 */
export const trimEnd = (str: string, char: string): string => {
  let res = str
  while (res.charAt(res.length - 1) === char) {
    res = res.substring(0, res.length - 1)
  }
  return res
}

/**
 * Removes a stating, leading and trailing line terminator character from a string.
 *
 * @export
 * @param {string} str
 * @param {string} char
 * @returns {string}
 */
export const trim = (str: string, char: string): string => {
  let res = trimStart(str, char)
  res = trimEnd(res, char)
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
  const p1 = trimEnd(part1, '/')
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
export const generateToken = () => `${nanoid()}-${Date.now()}`

/**
 * The IETF language tag of the locale Checkout is displayed in.
 *
 * @param {string} locale
 * @returns {Stripe.Checkout.SessionCreateParams.Locale}
 */
export const getStripeLocale = (locale: string): Stripe.Checkout.SessionCreateParams.Locale => {
  const locales = [
    'bg',
    'cs',
    'da',
    'de',
    'el',
    'en',
    'en-GB',
    'es',
    'es-419',
    'et',
    'fi',
    'fil',
    'fr',
    'fr-CA',
    'hr',
    'hu',
    'id',
    'it',
    'ja',
    'ko',
    'lt',
    'lv',
    'ms',
    'mt',
    'nb',
    'nl',
    'pl',
    'pt',
    'pt-BR',
    'ro',
    'ru',
    'sk',
    'sl',
    'sv',
    'th',
    'tr',
    'vi',
    'zh',
    'zh-HK',
    'zh-TW',
  ]

  if (locales.includes(locale)) {
    return locale as Stripe.Checkout.SessionCreateParams.Locale
  }

  return 'auto'
}

/**
 * Parse JWT token.
 *
 * @param {string} token
 * @returns {any}
 */
export const parseJwt = (token: string) => JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())

/**
 * Validate JWT token structure.
 *
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export const validateAccessToken = async (socialSignInType: bookcarsTypes.SocialSignInType, token: string, email: string): Promise<boolean> => {
  if (socialSignInType === bookcarsTypes.SocialSignInType.Facebook) {
    try {
      parseJwt(token)
      return true
    } catch {
      return false
    }
  }

  if (socialSignInType === bookcarsTypes.SocialSignInType.Apple) {
    try {
      const res = parseJwt(token)
      return res.email === email
    } catch {
      return false
    }
  }

  if (socialSignInType === bookcarsTypes.SocialSignInType.Google) {
    try {
      const res = await axios.get(
        'https://www.googleapis.com/oauth2/v3/tokeninfo',
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      return res.data.email === email
    } catch {
      return false
    }
  }

  return false
}

/**
 * Format PayPal price.
 *
 * Example:
 * 1          1.00
 * 1.2        1.20
 * 1.341      1.34
 * 1.345      1.34
 * 1.378      1.37
 *
 * @param {number} price
 * @returns {string}
 */
export const formatPayPalPrice = (price: number) => (Math.floor(price * 100) / 100).toFixed(2)

/**
 * Calculate distance between two coordinates using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of the first point
 * @param {number} lon1 - Longitude of the first point
 * @param {number} lat2 - Latitude of the second point
 * @param {number} lon2 - Longitude of the second point
 * @param {string} unit - Unit of measurement ('K' for kilometers, 'M' for miles, 'N' for nautical miles)
 * @returns {number} Distance between the two points in the specified unit
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number, unit: 'K' | 'M' | 'N' = 'K'): number => {
  if ((lat1 === lat2) && (lon1 === lon2)) {
    return 0;
  }
  
  // Convert latitude and longitude from degrees to radians
  const radLat1 = Math.PI * lat1 / 180;
  const radLon1 = Math.PI * lon1 / 180;
  const radLat2 = Math.PI * lat2 / 180;
  const radLon2 = Math.PI * lon2 / 180;
  
  // Calculate differences
  const radLatDiff = radLat2 - radLat1;
  const radLonDiff = radLon2 - radLon1;
  
  // Haversine formula
  let dist = Math.sin(radLatDiff/2) * Math.sin(radLatDiff/2) +
             Math.cos(radLat1) * Math.cos(radLat2) * 
             Math.sin(radLonDiff/2) * Math.sin(radLonDiff/2);
  
  dist = 2 * Math.atan2(Math.sqrt(dist), Math.sqrt(1-dist));
  
  // Earth's radius in kilometers
  const earthRadius = 6371;
  dist = earthRadius * dist;
  
  // Convert to requested unit
  if (unit === "M") { // Miles
    dist = dist * 0.621371;
  } else if (unit === "N") { // Nautical miles
    dist = dist * 0.539957;
  }
  // Default is kilometers (unit === 'K')
  
  return dist;
};

/**
 * Format distance into a user-friendly string.
 *
 * @param {number} distance - Distance value
 * @param {string} unit - Unit of measurement ('K' for kilometers, 'M' for miles)
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance: number, unit: 'K' | 'M' = 'K'): string => {
  if (distance < 0.1) {
    // Convert to meters if less than 100 meters
    return `${Math.round(distance * 1000)} ${unit === 'K' ? 'm' : 'ft'}`;
  } else if (distance < 10) {
    // Show one decimal place if less than 10 km/miles
    return `${distance.toFixed(1)} ${unit === 'K' ? 'km' : 'mi'}`;
  } else {
    // Round to nearest integer if 10 or more km/miles
    return `${Math.round(distance)} ${unit === 'K' ? 'km' : 'mi'}`;
  }
};
