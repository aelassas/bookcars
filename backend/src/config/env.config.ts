import * as bookcarsTypes from ':bookcars-types'
import Const from './const'

//
// ISO 639-1 language codes and their labels
// https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
//
const LANGUAGES = [
  {
    code: 'en',
    label: 'English',
  },
  {
    code: 'fr',
    label: 'Français',
  },
  {
    code: 'es',
    label: 'Español',
  },
]

const env = {
  isMobile: window.innerWidth <= 960,
  isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),

  WEBSITE_NAME: String(import.meta.env.VITE_BC_WEBSITE_NAME),

  APP_TYPE: bookcarsTypes.AppType.Backend,
  API_HOST: String(import.meta.env.VITE_BC_API_HOST),
  LANGUAGES: LANGUAGES.map((l) => l.code),
  _LANGUAGES: LANGUAGES,
  DEFAULT_LANGUAGE: String(import.meta.env.VITE_BC_DEFAULT_LANGUAGE || 'en'),
  PAGE_SIZE: Number.parseInt(String(import.meta.env.VITE_BC_PAGE_SIZE), 10) || 30,
  CARS_PAGE_SIZE: Number.parseInt(String(import.meta.env.VITE_BC_CARS_PAGE_SIZE), 10) || 15,
  BOOKINGS_PAGE_SIZE: Number.parseInt(String(import.meta.env.VITE_BC_BOOKINGS_PAGE_SIZE), 10) || 20,
  BOOKINGS_MOBILE_PAGE_SIZE: Number.parseInt(String(import.meta.env.VITE_BC_BOOKINGS_MOBILE_PAGE_SIZE), 10) || 10,
  CDN_USERS: String(import.meta.env.VITE_BC_CDN_USERS),
  CDN_TEMP_USERS: String(import.meta.env.VITE_BC_CDN_TEMP_USERS),
  CDN_CARS: String(import.meta.env.VITE_BC_CDN_CARS),
  CDN_TEMP_CARS: String(import.meta.env.VITE_BC_CDN_TEMP_CARS),
  CDN_LOCATIONS: String(import.meta.env.VITE_BC_CDN_LOCATIONS),
  CDN_TEMP_LOCATIONS: String(import.meta.env.VITE_BC_CDN_TEMP_LOCATIONS),
  CDN_CONTRACTS: String(import.meta.env.VITE_BC_CDN_CONTRACTS),
  CDN_TEMP_CONTRACTS: String(import.meta.env.VITE_BC_CDN_TEMP_CONTRACTS),
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
  MINIMUM_AGE: Number.parseInt(String(import.meta.env.VITE_BC_MINIMUM_AGE), 10) || 21,
  // PAGINATION_MODE: CLASSIC or INFINITE_SCROLL
  // If you choose CLASSIC, you will get a classic pagination with next and previous buttons on desktop and infinite scroll on mobile.
  // If you choose INFINITE_SCROLL, you will get infinite scroll on desktop and mobile.
  // Defaults to CLASSIC
  PAGINATION_MODE:
    (import.meta.env.VITE_BC_PAGINATION_MODE && import.meta.env.VITE_BC_PAGINATION_MODE.toUpperCase()) === Const.PAGINATION_MODE.INFINITE_SCROLL
      ? Const.PAGINATION_MODE.INFINITE_SCROLL
      : Const.PAGINATION_MODE.CLASSIC,
  CURRENCY: import.meta.env.VITE_BC_CURRENCY || '$',
  DEPOSIT_FILTER_VALUE_1: Number.parseInt(String(import.meta.env.VITE_BC_DEPOSIT_FILTER_VALUE_1), 10),
  DEPOSIT_FILTER_VALUE_2: Number.parseInt(String(import.meta.env.VITE_BC_DEPOSIT_FILTER_VALUE_2), 10),
  DEPOSIT_FILTER_VALUE_3: Number.parseInt(String(import.meta.env.VITE_BC_DEPOSIT_FILTER_VALUE_3), 10),
  CONTACT_EMAIL: String(import.meta.env.VITE_BC_CONTACT_EMAIL),
  RECAPTCHA_ENABLED: (import.meta.env.VITE_BC_RECAPTCHA_ENABLED && import.meta.env.VITE_BC_RECAPTCHA_ENABLED.toLowerCase()) === 'true',
  RECAPTCHA_SITE_KEY: String(import.meta.env.VITE_BC_RECAPTCHA_SITE_KEY),
}

export default env
