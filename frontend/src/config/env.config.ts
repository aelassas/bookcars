import * as bookcarsTypes from ':bookcars-types'
import Const from './const'

type Language = { code: string, countryCode: string, label: string }

/**
 * ISO 639-1 language codes and their labels
 * https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
 *
 * @type {Language[]}
 */
const LANGUAGES: Language[] = [
  {
    code: 'en',
    countryCode: 'us',
    label: 'English',
  },
  {
    code: 'fr',
    countryCode: 'fr',
    label: 'Français',
  },
  {
    code: 'es',
    countryCode: 'es',
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
const CURRENCIES: Currency[] = [
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
  }
]

const env = {
  isMobile: window.innerWidth <= 960,
  isProduction: import.meta.env.VITE_NODE_ENV === 'production',
  isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),

  WEBSITE_NAME: String(import.meta.env.VITE_BC_WEBSITE_NAME || 'BookCars'),

  APP_TYPE: bookcarsTypes.AppType.Frontend,
  API_HOST: String(import.meta.env.VITE_BC_API_HOST),
  LANGUAGES: LANGUAGES.map((l) => l.code),
  _LANGUAGES: LANGUAGES,
  DEFAULT_LANGUAGE: String(import.meta.env.VITE_BC_DEFAULT_LANGUAGE || 'en'),
  BASE_CURRENCY: String(import.meta.env.VITE_BC_BASE_CURRENCY || 'USD'),
  CURRENCIES,
  PAGE_SIZE: Number.parseInt(String(import.meta.env.VITE_BC_PAGE_SIZE), 10) || 30,
  CARS_PAGE_SIZE: Number.parseInt(String(import.meta.env.VITE_BC_CARS_PAGE_SIZE), 10) || 15,
  BOOKINGS_PAGE_SIZE: Number.parseInt(String(import.meta.env.VITE_BC_BOOKINGS_PAGE_SIZE), 10) || 20,
  BOOKINGS_MOBILE_PAGE_SIZE: Number.parseInt(String(import.meta.env.VITE_BC_BOOKINGS_MOBILE_PAGE_SIZE), 10) || 10,
  CDN_USERS: String(import.meta.env.VITE_BC_CDN_USERS),
  CDN_CARS: String(import.meta.env.VITE_BC_CDN_CARS),
  CDN_LOCATIONS: String(import.meta.env.VITE_BC_CDN_LOCATIONS),
  CDN_LICENSES: String(import.meta.env.VITE_BC_CDN_LICENSES),
  CDN_TEMP_LICENSES: String(import.meta.env.VITE_BC_CDN_TEMP_LICENSES),
  PAGE_OFFSET: 200,
  INFINITE_SCROLL_OFFSET: 40,
  SUPPLIER_IMAGE_WIDTH: Number.parseInt(String(import.meta.env.VITE_BC_SUPPLIER_IMAGE_WIDTH), 10) || 60,
  SUPPLIER_IMAGE_HEIGHT: Number.parseInt(String(import.meta.env.VITE_BC_SUPPLIER_IMAGE_HEIGHT), 10) || 30,
  CAR_IMAGE_WIDTH: Number.parseInt(String(import.meta.env.VITE_BC_CAR_IMAGE_WIDTH), 10) || 300,
  CAR_IMAGE_HEIGHT: Number.parseInt(String(import.meta.env.VITE_BC_CAR_IMAGE_HEIGHT), 10) || 200,
  CAR_OPTION_IMAGE_HEIGHT: 85,
  SELECTED_CAR_OPTION_IMAGE_HEIGHT: 30,
  RECAPTCHA_ENABLED: (import.meta.env.VITE_BC_RECAPTCHA_ENABLED && import.meta.env.VITE_BC_RECAPTCHA_ENABLED.toLowerCase()) === 'true',
  RECAPTCHA_SITE_KEY: String(import.meta.env.VITE_BC_RECAPTCHA_SITE_KEY),
  MINIMUM_AGE: Number.parseInt(String(import.meta.env.VITE_BC_MINIMUM_AGE), 10) || 21,
  /**
   * PAGINATION_MODE: CLASSIC or INFINITE_SCROLL
   * If you choose CLASSIC, you will get a classic pagination with next and previous buttons on desktop and infinite scroll on mobile.
   * If you choose INFINITE_SCROLL, you will get infinite scroll on desktop and mobile.
   * Default is CLASSIC
   */
  PAGINATION_MODE:
    (import.meta.env.VITE_BC_PAGINATION_MODE && import.meta.env.VITE_BC_PAGINATION_MODE.toUpperCase()) === Const.PAGINATION_MODE.INFINITE_SCROLL
      ? Const.PAGINATION_MODE.INFINITE_SCROLL
      : Const.PAGINATION_MODE.CLASSIC,
  STRIPE_PUBLISHABLE_KEY: String(import.meta.env.VITE_BC_STRIPE_PUBLISHABLE_KEY),
  SET_LANGUAGE_FROM_IP: (import.meta.env.VITE_BC_SET_LANGUAGE_FROM_IP && import.meta.env.VITE_BC_SET_LANGUAGE_FROM_IP.toLowerCase()) === 'true',
  GOOGLE_ANALYTICS_ENABLED: (import.meta.env.VITE_BC_GOOGLE_ANALYTICS_ENABLED && import.meta.env.VITE_BC_GOOGLE_ANALYTICS_ENABLED.toLowerCase()) === 'true',
  GOOGLE_ANALYTICS_ID: String(import.meta.env.VITE_BC_GOOGLE_ANALYTICS_ID),
  CONTACT_EMAIL: import.meta.env.VITE_BC_CONTACT_EMAIL,
  DEPOSIT_FILTER_VALUE_1: Number.parseInt(String(import.meta.env.VITE_BC_DEPOSIT_FILTER_VALUE_1), 10),
  DEPOSIT_FILTER_VALUE_2: Number.parseInt(String(import.meta.env.VITE_BC_DEPOSIT_FILTER_VALUE_2), 10),
  DEPOSIT_FILTER_VALUE_3: Number.parseInt(String(import.meta.env.VITE_BC_DEPOSIT_FILTER_VALUE_3), 10),
  FB_APP_ID: String(import.meta.env.VITE_BC_FB_APP_ID),
  APPLE_ID: String(import.meta.env.VITE_BC_APPLE_ID),
  GG_APP_ID: String(import.meta.env.VITE_BC_GG_APP_ID),
  /**
   * Minimum number of locations required for country tabs in homepage.
   */
  MIN_LOCATIONS: Number.parseInt(String(import.meta.env.VITE_BC_MIN_LOCATIONS), 10) || 4,
}

export default env
