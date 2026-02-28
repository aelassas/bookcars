import {
  BC_API_HOST,
  BC_DEFAULT_LANGUAGE,
  BC_PAGE_SIZE,
  BC_CARS_PAGE_SIZE,
  BC_BOOKINGS_PAGE_SIZE,
  BC_CDN_USERS,
  BC_CDN_CARS,
  BC_CDN_LICENSES,
  BC_CDN_TEMP_LICENSES,
  BC_SUPPLIER_IMAGE_WIDTH,
  BC_SUPPLIER_IMAGE_HEIGHT,
  BC_CAR_IMAGE_WIDTH,
  BC_CAR_IMAGE_HEIGHT,
  BC_MINIMUM_AGE,
  BC_STRIPE_PUBLISHABLE_KEY,
  BC_STRIPE_MERCHANT_IDENTIFIER,
  BC_STRIPE_COUNTRY_CODE,
  BC_BASE_CURRENCY,
  BC_DEPOSIT_FILTER_VALUE_1,
  BC_DEPOSIT_FILTER_VALUE_2,
  BC_DEPOSIT_FILTER_VALUE_3,
  BC_WEBSITE_NAME,
  BC_GOOGLE_WEB_CLIENT_ID,
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
  {
    code: 'es',
    label: 'Español',
  },
]

type Currency = { code: string, symbol: string }

/**
 * The three-letter ISO 4217 alphabetic currency codes, e.g. "USD" or "EUR" and their symbols.
 * https://docs.stripe.com/currencies
 *
 * @type {Currency[]}
 */
export const CURRENCIES: Currency[] = [
  {
    code: 'USD',
    symbol: '$',
  },
  {
    code: 'EUR',
    symbol: '€',
  },
  {
    code: 'GBP',
    symbol: '£',
  },
  {
    code: 'AUD',
    symbol: '$',
  },
]

/**
 * Application type.
 *
 * @type {string}
 */
export const APP_TYPE: string = 'frontend'

/**
 * Website name.
 *
 * @type {string}
 */
export const WEBSITE_NAME: string = String(BC_WEBSITE_NAME || 'BookCars')

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
 * Driver licenses CDN.
 *
 * @type {string}
 */
export const CDN_LICENSES: string = BC_CDN_LICENSES

/**
 * Temp driver licenses CDN.
 *
 * @type {string}
 */
export const CDN_TEMP_LICENSES: string = BC_CDN_TEMP_LICENSES

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
 * The three-letter ISO 4217 alphabetic currency code, e.g. "USD" or "EUR" base currency. Default is USD.
 *
 * @type {string}
 */
export const BASE_CURRENCY: string = BC_BASE_CURRENCY || 'USD'

/**
 * Deposit filter first value.
 *
 * @type {number}
 */
export const DEPOSIT_FILTER_VALUE_1: number = Number(BC_DEPOSIT_FILTER_VALUE_1)

/**
 * Deposit filter second value.
 *
 * @type {number}
 */
export const DEPOSIT_FILTER_VALUE_2: number = Number(BC_DEPOSIT_FILTER_VALUE_2)

/**
 * Deposit filter third value.
 *
 * @type {number}
 */
export const DEPOSIT_FILTER_VALUE_3: number = Number(BC_DEPOSIT_FILTER_VALUE_3)

/**
 * Google WebClientID.
 *
 * @type {string}
 */
export const GOOGLE_WEB_CLIENT_ID: string = String(BC_GOOGLE_WEB_CLIENT_ID)
