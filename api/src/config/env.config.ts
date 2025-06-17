import process from 'node:process'
import { Document, Types } from 'mongoose'
import { CookieOptions } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '../common/helper'

/**
 * Get environment variable value.
 *
 * @param {string} name
 * @param {?boolean} [required]
 * @param {?string} [defaultValue]
 * @returns {string}
 */
export const __env__ = (name: string, required?: boolean, defaultValue?: string): string => {
  const value = process.env[name]
  if (required && !value) {
    throw new Error(`'${name} not found`)
  }
  if (!value) {
    return defaultValue || ''
  }
  return String(value)
}

/**
 * ISO 639-1 language codes supported
 * https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
 *
 * @type {string[]}
 */
export const LANGUAGES = [
  'en',
  'fr',
  'es',
]

/**
 * Name of the field used for TTL (Time-To-Live) index expiration.
 * MongoDB automatically deletes documents when the date in this field is reached.
 * 
 * @constant
 * @type {string}
 */
export const expireAt = 'expireAt'

/**
 * Website Name.
 *
 * @type {string}
 */
export const WEBSITE_NAME = __env__('BC_WEBSITE_NAME', false, 'BookCars')

/**
 * Indicate whether we are in CI environment or not.
 *
 * @type {string}
 */
export const CI = helper.StringToBoolean(__env__('BC_CI', false, 'false'))

/**
 * Number of documents to process per batch when deleting obsolete language values.
 * This helps avoid large memory usage and improves performance during deletions.
 * Default is 1000.
 *
 * @type {number}
 */
export const BATCH_SIZE = Number.parseInt(__env__('BC_BATCH_SIZE', false, '1000'), 10)

/**
 * Server Port. Default is 4002.
 *
 * @type {number}
 */
export const PORT = Number.parseInt(__env__('BC_PORT', false, '4002'), 10)

/**
 * Indicate whether HTTPS is enabled or not.
 *
 * @type {boolean}
 */
export const HTTPS = helper.StringToBoolean(__env__('BC_HTTPS'))

/**
 * Private SSL key filepath.
 *
 * @type {string}
 */
export const PRIVATE_KEY = __env__('BC_PRIVATE_KEY', HTTPS)

/**
 * Private SSL certificate filepath.
 *
 * @type {string}
 */
export const CERTIFICATE = __env__('BC_CERTIFICATE', HTTPS)

/**
 * MongoDB database URI. Default is: mongodb://127.0.0.1:27017/bookcars?authSource=admin&appName=bookcars
 *
 * @type {string}
 */
export const DB_URI = __env__('BC_DB_URI', false, 'mongodb://127.0.0.1:27017/bookcars?authSource=admin&appName=bookcars')

/**
 * Indicate whether MongoDB SSL is enabled or not.
 *
 * @type {boolean}
 */
export const DB_SSL = helper.StringToBoolean(__env__('BC_DB_SSL', false, 'false'))

/**
 * MongoDB SSL certificate filepath.
 *
 * @type {string}
 */
export const DB_SSL_CERT = __env__('BC_DB_SSL_CERT', DB_SSL)

/**
 * MongoDB SSL CA certificate filepath.
 *
 * @type {string}
 */
export const DB_SSL_CA = __env__('BC_DB_SSL_CA', DB_SSL)

/**
 * Indicate whether MongoDB debug is enabled or not.
 *
 * @type {boolean}
 */
export const DB_DEBUG = helper.StringToBoolean(__env__('BC_DB_DEBUG', false, 'false'))

/**
 * Cookie secret. It should at least be 32 characters long, but the longer the better.
 *
 * @type {string}
 */
export const COOKIE_SECRET = __env__('BC_COOKIE_SECRET', false, 'bookcars')

/**
 * Authentication cookie domain.
 * Default is localhost.
 *
 * @type {string}
 */
export const AUTH_COOKIE_DOMAIN = __env__('BC_AUTH_COOKIE_DOMAIN', false, 'localhost')

/**
 * Cookie options.
 *
 * On production, authentication cookies are httpOnly, signed, secure and strict sameSite.
 * This will prevent XSS attacks by not allowing access to the cookie via JavaScript.
 * This will prevent CSRF attacks by not allowing the browser to send the cookie along with cross-site requests.
 * This will prevent MITM attacks by only allowing the cookie to be sent over HTTPS.
 * Authentication cookies are protected against XST attacks as well by disabling TRACE HTTP method via allowedMethods middleware.
 *
 * @type {CookieOptions}
 */
export const COOKIE_OPTIONS: CookieOptions = { httpOnly: true, secure: HTTPS, signed: true, sameSite: 'strict', domain: AUTH_COOKIE_DOMAIN }

/**
 * frontend authentication cookie name.
 *
 * @type {"bc-x-access-token-frontend"}
 */
export const FRONTEND_AUTH_COOKIE_NAME = 'bc-x-access-token-frontend'

/**
 * Admin authentication cookie name.
 *
 * @type {"bc-x-access-token-frontend"}
 */
export const ADMIN_AUTH_COOKIE_NAME = 'bc-x-access-token-admin'

/**
 * Mobile App and unit tests authentication header name.
 *
 * @type {"x-access-token"}
 */
export const X_ACCESS_TOKEN = 'x-access-token'

/**
 * JWT secret. It should at least be 32 characters long, but the longer the better.
 *
 * @type {string}
 */
export const JWT_SECRET = __env__('BC_JWT_SECRET', false, 'bookcars')

/**
 * JWT expiration in seconds. Default is 86400 seconds (1 day).
 *
 * @type {number}
 */
export const JWT_EXPIRE_AT = Number.parseInt(__env__('BC_JWT_EXPIRE_AT', false, '86400'), 10)

/**
 * Validation Token expiration in seconds. Default is 86400 seconds (1 day).
 *
 * @type {number}
 */
export const TOKEN_EXPIRE_AT = Number.parseInt(__env__('BC_TOKEN_EXPIRE_AT', false, '86400'), 10)

/**
 * SMTP host.
 *
 * @type {string}
 */
export const SMTP_HOST = __env__('BC_SMTP_HOST', true)

/**
 * SMTP port.
 *
 * @type {number}
 */
export const SMTP_PORT = Number.parseInt(__env__('BC_SMTP_PORT', true), 10)

/**
 * SMTP username.
 *
 * @type {string}
 */
export const SMTP_USER = __env__('BC_SMTP_USER', true)

/**
 * SMTP password.
 *
 * @type {string}
 */
export const SMTP_PASS = __env__('BC_SMTP_PASS', true)

/**
 * SMTP from email.
 *
 * @type {string}
 */
export const SMTP_FROM = __env__('BC_SMTP_FROM', true)

/**
 * CDN root folder path.
 *
 * @type {string}
 */
export const CDN_ROOT = __env__('BC_CDN_ROOT', false, '/var/www/cdn')

/**
 * Users' cdn folder path.
 *
 * @type {string}
 */
export const CDN_USERS = __env__('BC_CDN_USERS', true)

/**
 * Users' temp cdn folder path.
 *
 * @type {string}
 */
export const CDN_TEMP_USERS = __env__('BC_CDN_TEMP_USERS', true)

/**
 * Cars' cdn folder path.
 *
 * @type {string}
 */
export const CDN_CARS = __env__('BC_CDN_CARS', true)

/**
 * Cars' temp cdn folder path.
 *
 * @type {string}
 */
export const CDN_TEMP_CARS = __env__('BC_CDN_TEMP_CARS', true)

/**
 * Locations' cdn folder path.
 *
 * @type {string}
 */
export const CDN_LOCATIONS = __env__('BC_CDN_LOCATIONS', true)

/**
 * Locations' temp cdn folder path.
 *
 * @type {string}
 */
export const CDN_TEMP_LOCATIONS = __env__('BC_CDN_TEMP_LOCATIONS', true)

/**
 * Contracts' cdn folder path.
 *
 * @type {string}
 */
export const CDN_CONTRACTS = __env__('BC_CDN_CONTRACTS', true)

/**
 * Contracts' temp cdn folder path.
 *
 * @type {string}
 */
export const CDN_TEMP_CONTRACTS = __env__('BC_CDN_TEMP_CONTRACTS', true)

/**
 * Licenses' cdn folder path.
 *
 * @type {string}
 */
export const CDN_LICENSES = __env__('BC_CDN_LICENSES', true)

/**
 * Licenses' temp cdn folder path.
 *
 * @type {string}
 */
export const CDN_TEMP_LICENSES = __env__('BC_CDN_TEMP_LICENSES', true)

/**
 * Admin host.
 *
 * @type {string}
 */
export const ADMIN_HOST = __env__('BC_ADMIN_HOST', true)

/**
 * Frontend host.
 *
 * @type {string}
 */
export const FRONTEND_HOST = __env__('BC_FRONTEND_HOST', true)

/**
 * Default language. Default is en. Available options: en, fr, es.
 *
 * @type {string}
 */
export const DEFAULT_LANGUAGE = __env__('BC_DEFAULT_LANGUAGE', false, 'en')

/**
 * Default Minimum age for rental. Default is 21 years.
 *
 * @type {number}
 */
export const MINIMUM_AGE = Number.parseInt(__env__('BC_MINIMUM_AGE', false, '21'), 10)

/**
 * Expo push access token.
 *
 * @type {string}
 */
export const EXPO_ACCESS_TOKEN = __env__('BC_EXPO_ACCESS_TOKEN', false)

/**
 * Stripe secret key.
 *
 * @type {string}
 */
export const STRIPE_SECRET_KEY = __env__('BC_STRIPE_SECRET_KEY', false, 'STRIPE_SECRET_KEY')

let stripeSessionExpireAt = Number.parseInt(__env__('BC_STRIPE_SESSION_EXPIRE_AT', false, '82800'), 10)
stripeSessionExpireAt = stripeSessionExpireAt < 1800 ? 1800 : stripeSessionExpireAt
stripeSessionExpireAt = stripeSessionExpireAt <= 82800 ? stripeSessionExpireAt : 82800

/**
 * Stripe Checkout Session expiration in seconds. Should be at least 1800 seconds (30min) and max 82800 seconds. Default is 82800 seconds (~23h).
 * If the value is lower than 1800 seconds, it wil be set to 1800 seconds.
 * If the value is greater than 82800 seconds, it wil be set to 82800 seconds.
 *
 * @type {number}
 */
export const STRIPE_SESSION_EXPIRE_AT = stripeSessionExpireAt

/**
 * Indicates whether PayPal is used in sandbox mode or production.
 *
 * @type {boolean}
 */
export const PAYPAL_SANDBOX = helper.StringToBoolean(__env__('BC_PAYPAL_SANDBOX', false, 'true'))

/**
 * PayPal client ID.
 *
 * @type {string}
 */
export const PAYPAL_CLIENT_ID = __env__('BC_PAYPAL_CLIENT_ID', false, 'PAYPAL_CLIENT_ID')

/**
 * PayPal client secret.
 *
 * @type {string}
 */
export const PAYPAL_CLIENT_SECRET = __env__('BC_PAYPAL_CLIENT_SECRET', false, 'PAYPAL_CLIENT_SECRET')

/**
 * Booking expiration in seconds.
 * Bookings created from checkout with Stripe are temporary and are automatically deleted if the payment checkout session expires.
 *
 * @type {number}
 */
export const BOOKING_EXPIRE_AT = STRIPE_SESSION_EXPIRE_AT + (10 * 60)

/**
 * User expiration in seconds.
 * Non verified and active users created from checkout with Stripe are temporary and are automatically deleted if the payment checkout session expires.
 *
 *
 * @type {number}
 */
export const USER_EXPIRE_AT = BOOKING_EXPIRE_AT

/**
 * Admin email.
 *
 * @type {string}
 */
export const ADMIN_EMAIL = __env__('BC_ADMIN_EMAIL', false)

/**
 * Google reCAPTCHA v3 secret key.
 *
 * @type {string}
 */
export const RECAPTCHA_SECRET = __env__('BC_RECAPTCHA_SECRET', false)

/**
 * Timezone for cenverting dates from UTC to local time.
 * Must be a valid TZ idenfidier: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
 * Default is UTC.
 *
 * @type {string}
 */
export const TIMEZONE = __env__('BC_TIMEZONE', false, 'UTC')

/**
 * ipinfo.io API key.
 * Required for more tha, 1000 requests/day.
 *
 * @type {string}
 */
export const IPINFO_API_KEY = __env__('BC_IPINFO_API_KEY', false)

/**
 * Default ISO 2 country code ipinfo.io.
 *
 * @type {string}
 */
export const IPINFO_DEFAULT_COUNTRY = __env__('BC_IPINFO_DEFAULT_COUNTRY', false, 'US')

/**
 * User Document.
 *
 * @export
 * @interface User
 * @typedef {User}
 * @extends {Document}
 */
export interface User extends Document {
  supplier?: Types.ObjectId
  fullName: string
  email: string
  phone?: string
  password?: string
  birthDate?: Date
  verified?: boolean
  verifiedAt?: Date
  active?: boolean
  language: string
  enableEmailNotifications?: boolean
  avatar?: string
  bio?: string
  location?: string
  type?: bookcarsTypes.UserType
  blacklisted?: boolean
  payLater?: boolean
  customerId?: string
  contracts?: bookcarsTypes.Contract[]
  licenseRequired?: boolean
  license?: string | null
  minimumRentalDays?: number
  expireAt?: Date
  priceChangeRate?: number
  supplierCarLimit?: number
  notifyAdminOnNewCar?: boolean
}

/**
 * UserInfo.
 *
 * @export
 * @interface UserInfo
 * @typedef {UserInfo}
 */
export interface UserInfo {
  _id?: Types.ObjectId
  supplier?: Types.ObjectId
  fullName: string
  email?: string
  phone?: string
  password?: string
  birthDate?: Date
  verified?: boolean
  verifiedAt?: Date
  active?: boolean
  language?: string
  enableEmailNotifications?: boolean
  avatar?: string
  bio?: string
  location?: string
  type?: string
  blacklisted?: boolean
  payLater?: boolean
  licenseRequired?: boolean
  license?: string
  priceChangeRate?: number
  supplierCarLimit?: number
  notifyAdminOnNewCar?: boolean
}

/**
 * AdditionalDriver.
 *
 * @export
 * @interface AdditionalDriver
 * @typedef {AdditionalDriver}
 */
export interface AdditionalDriver {
  fullName: string
  email: string
  phone: string
  birthDate: Date
}

/**
 * Booking Document.
 *
 * @export
 * @interface Booking
 * @typedef {Booking}
 * @extends {Document}
 */
export interface Booking extends Document {
  _id: Types.ObjectId
  supplier: Types.ObjectId
  car: Types.ObjectId
  driver: Types.ObjectId
  pickupLocation: Types.ObjectId
  dropOffLocation: Types.ObjectId
  from: Date
  to: Date
  status: bookcarsTypes.BookingStatus
  cancellation?: boolean
  amendments?: boolean
  theftProtection?: boolean
  collisionDamageWaiver?: boolean
  fullInsurance?: boolean
  additionalDriver?: boolean
  _additionalDriver?: Types.ObjectId
  cancelRequest?: boolean
  price: number
  sessionId?: string
  paymentIntentId?: string
  customerId?: string
  expireAt?: Date
  isDeposit: boolean
  paypalOrderId?: string
}

/**
 * Car Document.
 *
 * @export
 * @interface Car
 * @typedef {Car}
 * @extends {Document}
 */
export interface DateBasedPrice extends Document {
  startDate: Date
  endDate: Date
  dailyPrice: number
}

/**
 * Car Document.
 *
 * @export
 * @interface Car
 * @typedef {Car}
 * @extends {Document}
 */
export interface Car extends Document {
  name: string
  supplier: Types.ObjectId
  minimumAge: number
  locations: Types.ObjectId[]

  dailyPrice: number
  discountedDailyPrice: number | null
  biWeeklyPrice: number | null
  discountedBiWeeklyPrice: number | null
  weeklyPrice: number | null
  discountedWeeklyPrice: number | null
  monthlyPrice: number | null
  discountedMonthlyPrice: number | null

  isDateBasedPrice: boolean
  dateBasedPrices: Types.ObjectId[]

  deposit: number
  available: boolean
  fullyBooked?: boolean
  comingSoon?: boolean
  type: bookcarsTypes.CarType
  gearbox: bookcarsTypes.GearboxType
  aircon: boolean
  image: string | null
  seats: number
  doors: number
  fuelPolicy: bookcarsTypes.FuelPolicy
  mileage: number
  cancellation: number
  amendments: number
  theftProtection: number
  collisionDamageWaiver: number
  fullInsurance: number
  additionalDriver: number
  range: string
  multimedia: string[]
  rating?: number
  trips: number
  co2?: number
}

/**
 * CarInfo.
 *
 * @export
 * @interface CarInfo
 * @typedef {CarInfo}
 */
export interface CarInfo {
  _id?: Types.ObjectId
  name: string
  supplier: UserInfo
  minimumAge: number
  locations: Types.ObjectId[]
  price: number
  deposit: number
  available: boolean
  type: bookcarsTypes.CarType
  gearbox: bookcarsTypes.GearboxType
  aircon: boolean
  image?: string
  seats: number
  doors: number
  fuelPolicy: bookcarsTypes.FuelPolicy
  mileage: number
  cancellation: number
  amendments: number
  theftProtection: number
  collisionDamageWaiver: number
  fullInsurance: number
  additionalDriver: number
}

/**
 * BookingInfo.
 *
 * @export
 * @interface BookingInfo
 * @typedef {BookingInfo}
 */
export interface BookingInfo {
  _id?: Types.ObjectId
  supplier: UserInfo
  car: Car
  driver: UserInfo
  pickupLocation: Types.ObjectId
  dropOffLocation: Types.ObjectId
  from: Date
  to: Date
  status: bookcarsTypes.BookingStatus
  cancellation?: boolean
  amendments?: boolean
  theftProtection?: boolean
  collisionDamageWaiver?: boolean
  fullInsurance?: boolean
  additionalDriver?: boolean
  _additionalDriver?: Types.ObjectId
  cancelRequest?: boolean
  price: number
}

/**
 * LocationValue Document.
 *
 * @export
 * @interface LocationValue
 * @typedef {LocationValue}
 * @extends {Document}
 */
export interface LocationValue extends Document {
  language: string
  value: string
}

/**
 * Country Document.
 *
 * @export
 * @interface Country
 * @typedef {Country}
 * @extends {Document}
 */
export interface Country extends Document {
  values: Types.ObjectId[]
  name?: string
  supplier?: Types.ObjectId
}

/**
 *CountryInfo.
 *
 * @export
 * @interface CountryInfo
 * @typedef {CountryInfo}
 */
export interface CountryInfo {
  _id?: Types.ObjectId
  name?: string
  values: LocationValue[]
}

/**
 * Location Document.
 *
 * @export
 * @interface Location
 * @typedef {Location}
 * @extends {Document}
 */
export interface Location extends Document {
  country: Types.ObjectId
  longitude?: number
  latitude?: number
  values: Types.ObjectId[]
  name?: string
  image?: string | null
  parkingSpots?: Types.ObjectId[] | null
  supplier?: Types.ObjectId
}

/**
 *LocationInfo.
 *
 * @export
 * @interface LocationInfo
 * @typedef {LocationInfo}
 */
export interface LocationInfo {
  _id?: Types.ObjectId
  longitude: number
  latitude: number
  name?: string
  image?: string | null
  values: LocationValue[]
}

/**
 * ParkingSpot Document.
 *
 * @export
 * @interface ParkingSpot
 * @typedef {ParkingSpot}
 * @extends {Document}
 */
export interface ParkingSpot extends Document {
  longitude: number
  latitude: number
  values: (Types.ObjectId | LocationValue)[]
  name?: string
}

/**
 * Notification Document.
 *
 * @export
 * @interface Notification
 * @typedef {Notification}
 * @extends {Document}
 */
export interface Notification extends Document {
  user: Types.ObjectId
  message: string
  booking: Types.ObjectId
  car: Types.ObjectId
  isRead?: boolean
}

/**
 * NotificationCounter Document.
 *
 * @export
 * @interface NotificationCounter
 * @typedef {NotificationCounter}
 * @extends {Document}
 */
export interface NotificationCounter extends Document {
  user: Types.ObjectId
  count?: number
}

/**
 * PushToken Document.
 *
 * @export
 * @interface PushToken
 * @typedef {PushToken}
 * @extends {Document}
 */
export interface PushToken extends Document {
  user: Types.ObjectId
  token: string
}

/**
 * Token Document.
 *
 * @export
 * @interface Token
 * @typedef {Token}
 * @extends {Document}
 */
export interface Token extends Document {
  user: Types.ObjectId
  token: string
  expireAt?: Date
}

/**
 * BankDetails Document.
 *
 * @export
 * @interface BankDetails
 * @typedef {BankDetails}
 * @extends {Document}
 */
export interface BankDetails extends Document {
  accountHolder: string
  bankName: string
  iban: string
  swiftBic: string
  showBankDetailsPage: boolean
}
