import {
  BC_API_HOST,
  BC_DEFAULT_LANGUAGE,
  BC_PAGE_SIZE,
  BC_CARS_PAGE_SIZE,
  BC_BOOKINGS_PAGE_SIZE,
  BC_CDN_USERS,
  BC_CDN_CARS,
  BC_SUPPLIER_IMAGE_WIDTH,
  BC_SUPPLIER_IMAGE_HEIGHT,
  BC_CAR_IMAGE_WIDTH,
  BC_CAR_IMAGE_HEIGHT,
  BC_MINIMUM_AGE,
  BC_STRIPE_PUBLISHABLE_KEY,
  BC_STRIPE_MERCHANT_IDENTIFIER,
  BC_STRIPE_COUNTRY_CODE,
  BC_STRIPE_CURRENCY_CODE,
  BC_CURRENCY,
} from '@env'

/**
 * ISO 639-1 languages and their labels.
 * https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
 *
 * @type {{}}
 */
export const LANGUAGES = [
  {
    code: 'fr',
    label: 'Français',
  },
  {
    code: 'en',
    label: 'English',
  },
]

/**
 * Application type.
 *
 * @type {string}
 */
export const APP_TYPE: string = 'frontend'

/**
 * API host.
 *
 * @type {string}
 */
export const API_HOST: string = BC_API_HOST

/**
 * Axios timeout in milliseconds.
 *
 * @type {number}
 */
export const AXIOS_TIMEOUT: number = 5000

/**
 * Number of maximum axiosInstance retries.
 *
 * @type {number}
 */
export const AXIOS_RETRIES: number = 3

/**
 * Axios retries interval in milliseconds.
 *
 * @type {number}
 */
export const AXIOS_RETRIES_INTERVAL: number = 500 // in milliseconds

/**
 * Default language. Default is English.
 *
 * @type {string}
 */
export const DEFAULT_LANGUAGE: string = BC_DEFAULT_LANGUAGE || 'en'

/**
 * Page size. Default is 20.
 *
 * @type {number}
 */
export const PAGE_SIZE: number = Number.parseInt(BC_PAGE_SIZE, 10) || 20

/**
 * Cars page size. Default is 8.
 *
 * @type {number}
 */
export const CARS_PAGE_SIZE: number = Number.parseInt(BC_CARS_PAGE_SIZE, 10) || 8

/**
 * Bookings page size. Default is 8.
 *
 * @type {number}
 */
export const BOOKINGS_PAGE_SIZE: number = Number.parseInt(BC_BOOKINGS_PAGE_SIZE, 10) || 8

/**
 * User images CDN.
 *
 * @type {string}
 */
export const CDN_USERS: string = BC_CDN_USERS

/**
 * Car images CDN.
 *
 * @type {string}
 */
export const CDN_CARS: string = BC_CDN_CARS

/**
 * Page offset.
 *
 * @type {number}
 */
export const PAGE_OFFSET: number = 200

/**
 * Supplier image width. Default is 60.
 *
 * @type {number}
 */
export const SUPPLIER_IMAGE_WIDTH: number = Number.parseInt(BC_SUPPLIER_IMAGE_WIDTH, 10) || 60

/**
 * Supplier image height. Default is 30.
 *
 * @type {number}
 */
export const SUPPLIER_IMAGE_HEIGHT: number = Number.parseInt(BC_SUPPLIER_IMAGE_HEIGHT, 10) || 30

/**
 * Car image width. Default is 300.
 *
 * @type {number}
 */
export const CAR_IMAGE_WIDTH: number = Number.parseInt(BC_CAR_IMAGE_WIDTH, 10) || 300

/**
 * Car image height. Default is 200.
 *
 * @type {number}
 */
export const CAR_IMAGE_HEIGHT: number = Number.parseInt(BC_CAR_IMAGE_HEIGHT, 10) || 200

/**
 * Minimum age. Default is 21.
 *
 * @type {number}
 */
export const MINIMUM_AGE: number = Number.parseInt(BC_MINIMUM_AGE, 10) || 21

/**
 * Stripe Publishable Key.
 *
 * @type {string}
 */
export const STRIPE_PUBLISHABLE_KEY: string = BC_STRIPE_PUBLISHABLE_KEY

/**
 * The merchant identifier you registered with Apple for use with Apple Pay.
 *
 * @type {string}
 */
export const STRIPE_MERCHANT_IDENTIFIER: string = BC_STRIPE_MERCHANT_IDENTIFIER

/**
 * The two-letter ISO 3166 code of the country of your business, e.g. "US". Required for Stripe payments.
 *
 * @type {string}
 */
export const STRIPE_COUNTRY_CODE: string = BC_STRIPE_COUNTRY_CODE

/**
 * The three-letter ISO 4217 alphabetic currency code, e.g. "USD" or "EUR". Required for Stripe payments.
 * Must be a supported currency: https://docs.stripe.com/currencies
 *
 * @type {string}
 */
export const STRIPE_CURRENCY_CODE: string = BC_STRIPE_CURRENCY_CODE

/**
 * Currency. Default is $.
 *
 * @type {string}
 */
export const CURRENCY: string = BC_CURRENCY
