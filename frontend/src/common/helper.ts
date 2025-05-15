import { toast } from 'react-toastify'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/cars'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'
import * as PaymentService from '@/services/PaymentService'
import * as UserService from '@/services/UserService'

/**
 * Get language.
 *
 * @param {string} code
 * @returns {*}
 */
export const getLanguage = (code: string) => env._LANGUAGES.find((l) => l.code === code)

/**
 * Toast info message.
 *
 * @param {string} message
 */
export const info = (message: string) => {
  toast.info(message)
}

/**
 * Toast error message.
 *
 * @param {?unknown} [err]
 * @param {?string} [message]
 */
export const error = (err?: unknown, message?: string) => {
  if (err && console?.log) {
    console.log(err)
  }
  if (message) {
    toast.error(message)
  } else {
    toast.error(commonStrings.GENERIC_ERROR)
  }
}









/**
 * Get additional driver label.
 *
 * @param {number} additionalDriver
 * @param {string} language
 * @returns {string}
 */
export const getAdditionalDriver = async (additionalDriver: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (additionalDriver === -1) {
    return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (additionalDriver === 0) {
    return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.INCLUDED}`
  }
  let _additionalDriver = await PaymentService.convertPrice(additionalDriver)
  _additionalDriver += _additionalDriver * (priceChangeRate / 100)
  return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_additionalDriver, commonStrings.CURRENCY, language)}${commonStrings.DAILY}`
}



/**
 * Get amendments label.
 *
 * @param {number} amendments
 * @param {string} language
 * @returns {string}
 */
export const getAmendments = async (amendments: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (amendments === -1) {
    return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}${fr ? 's' : ''}`
  } if (amendments === 0) {
    return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'es' : ''}`
  }
  let _amendments = await PaymentService.convertPrice(amendments)
  _amendments += _amendments * (priceChangeRate / 100)
  return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_amendments, commonStrings.CURRENCY, language)}`
}

/**
 * Get cancellation label.
 *
 * @param {number} cancellation
 * @param {string} language
 * @returns {string}
 */
export const getCancellation = async (cancellation: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (cancellation === -1) {
    return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (cancellation === 0) {
    return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  let _cancellation = await PaymentService.convertPrice(cancellation)
  _cancellation += _cancellation * (priceChangeRate / 100)
  return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_cancellation, commonStrings.CURRENCY, language)}`
}

/**
 * Get booking status label.
 *
 * @param {string} status
 * @returns {string}
 */
export const getBookingStatus = (status?: bookcarsTypes.BookingStatus) => {
  switch (status) {
    case bookcarsTypes.BookingStatus.Void:
      return commonStrings.BOOKING_STATUS_VOID

    case bookcarsTypes.BookingStatus.Pending:
      return commonStrings.BOOKING_STATUS_PENDING

    case bookcarsTypes.BookingStatus.Deposit:
      return commonStrings.BOOKING_STATUS_DEPOSIT

    case bookcarsTypes.BookingStatus.Paid:
      return commonStrings.BOOKING_STATUS_PAID

    case bookcarsTypes.BookingStatus.Reserved:
      return commonStrings.BOOKING_STATUS_RESERVED

    case bookcarsTypes.BookingStatus.Cancelled:
      return commonStrings.BOOKING_STATUS_CANCELLED

    default:
      return ''
  }
}

/**
 * Get all booking statuses.
 *
 * @returns {bookcarsTypes.StatusFilterItem[]}
 */
export const getBookingStatuses = (): bookcarsTypes.StatusFilterItem[] => [
  {
    value: bookcarsTypes.BookingStatus.Void,
    label: commonStrings.BOOKING_STATUS_VOID,
  },
  {
    value: bookcarsTypes.BookingStatus.Pending,
    label: commonStrings.BOOKING_STATUS_PENDING,
  },
  {
    value: bookcarsTypes.BookingStatus.Deposit,
    label: commonStrings.BOOKING_STATUS_DEPOSIT,
  },
  {
    value: bookcarsTypes.BookingStatus.Paid,
    label: commonStrings.BOOKING_STATUS_PAID,
  },
  {
    value: bookcarsTypes.BookingStatus.Reserved,
    label: commonStrings.BOOKING_STATUS_RESERVED,
  },
  {
    value: bookcarsTypes.BookingStatus.Cancelled,
    label: commonStrings.BOOKING_STATUS_CANCELLED,
  },
]

/**
 * Get days label
 *
 * @param {number} days
 * @returns {string}
 */
export const getDays = (days: number) =>
  `${strings.PRICE_DAYS_PART_1} ${days} ${strings.PRICE_DAYS_PART_2}${days > 1 ? 's' : ''}`

/**
 * Get short days label.
 *
 * @param {number} days
 * @returns {string}
 */
export const getDaysShort = (days: number) => `${days} ${strings.PRICE_DAYS_PART_2}${days > 1 ? 's' : ''}`

/**
 * Get cancellation option label.
 *
 * @param {number} cancellation
 * @param {string} language
 * @returns {string}
 */
export const getCancellationOption = async (cancellation: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (cancellation === -1) {
    return strings.UNAVAILABLE
  } if (cancellation === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  let _cancellation = await PaymentService.convertPrice(cancellation)
  _cancellation += _cancellation * (priceChangeRate / 100)
  return `+ ${bookcarsHelper.formatPrice(_cancellation, commonStrings.CURRENCY, language)}`
}

/**
 * Get amendments option label.
 *
 * @param {number} amendments
 * @param {string} language
 * @param {number} priceChangeRate
 * @returns {string}
 */
export const getAmendmentsOption = async (amendments: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (amendments === -1) {
    return `${strings.UNAVAILABLE}${fr ? 's' : ''}`
  } if (amendments === 0) {
    return `${strings.INCLUDED}${fr ? 'es' : ''}`
  }
  let _amendments = await PaymentService.convertPrice(amendments)
  _amendments += _amendments * (priceChangeRate / 100)
  return `+ ${bookcarsHelper.formatPrice(_amendments, commonStrings.CURRENCY, language)}`
}



/**
 * Get additional driver option label.
 *
 * @param {number} additionalDriver
 * @param {number} days
 * @param {string} language
 * @param {number} priceChangeRate
 * @returns {string}
 */
export const getAdditionalDriverOption = async (additionalDriver: number, days: number, language: string, priceChangeRate: number) => {
  if (additionalDriver === -1) {
    return strings.UNAVAILABLE
  } if (additionalDriver === 0) {
    return strings.INCLUDED
  }
  let _additionalDriver = await PaymentService.convertPrice(additionalDriver)
  _additionalDriver += _additionalDriver * (priceChangeRate / 100)
  return `+ ${bookcarsHelper.formatPrice(_additionalDriver * days, commonStrings.CURRENCY, language)} (${bookcarsHelper.formatPrice(_additionalDriver, commonStrings.CURRENCY, language)}${commonStrings.DAILY})`
}

/**
 * Get birthdate error message.
 *
 * @param {number} minimumAge
 * @returns {string}
 */
export const getBirthDateError = (minimumAge: number) =>
  `${commonStrings.BIRTH_DATE_NOT_VALID_PART1} ${minimumAge} ${commonStrings.BIRTH_DATE_NOT_VALID_PART2}`

/**
 * Check whether a dress option is available or not.
 *
 * @param {(bookcarsTypes.Dress | undefined)} dress
 * @param {string} option
 * @returns {boolean}
 */
export const dressOptionAvailable = (dress: bookcarsTypes.Dress | undefined, option: string) =>
  dress && option in dress && (dress[option] as number) > -1

/**
 * Return [latitude, longitude] of user.
 *
 * @async
 * @returns {Promise<[number, number] | null>}
 */
export const getLocation = async (): Promise<[number, number] | null> => {
  try {
    if (navigator.geolocation) {
      const position: GeolocationPosition = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })
      const { latitude, longitude } = position.coords
      return [latitude, longitude]
    }
    console.log('Geolocation is not supported by this browser.')
  } catch (err: any) {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        console.log('User denied the request for Geolocation:', err.message)
        break
      case err.POSITION_UNAVAILABLE:
        console.log('Location information is unavailable:', err.message)
        break
      case err.TIMEOUT:
        console.log('The request to get user location timed out:', err.message)
        break
      default:
        console.log('An unknown geolocation error occurred:', err.message)
        break
    }
  }

  return null
}

/**
 * Download URI.
 *
 * @param {string} uri
 * @param {string} [name='']
 */
export const downloadURI = (uri: string, name: string = '') => {
  const link = document.createElement('a')
  // If you don't know the name or want to use
  // the webserver default set name = ''
  link.setAttribute('download', name)
  link.setAttribute('target', '_blank')
  link.href = uri
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/**
 * Verify reCAPTCHA token.
 *
 * @async
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export const verifyReCaptcha = async (token: string): Promise<boolean> => {
  try {
    const ip = await UserService.getIP()
    const status = await UserService.verifyRecaptcha(token, ip)
    const valid = status === 200
    return valid
  } catch (err) {
    error(err)
    return false
  }
}

/**
 * Get dress range label.
 *
 * @param {string} range
 * @returns {string}
 */
export const getDressRange = (range: bookcarsTypes.DressRange) => {
  switch (range) {
    case bookcarsTypes.DressRange.Mini:
      return strings.DRESS_RANGE_MINI

    case bookcarsTypes.DressRange.Midi:
      return strings.DRESS_RANGE_MIDI

    case bookcarsTypes.DressRange.Maxi:
      return strings.DRESS_RANGE_MAXI

    case bookcarsTypes.DressRange.Bridal:
      return strings.DRESS_RANGE_BRIDAL

    case bookcarsTypes.DressRange.Evening:
      return strings.DRESS_RANGE_EVENING

    case bookcarsTypes.DressRange.Cocktail:
      return strings.DRESS_RANGE_COCKTAIL

    case bookcarsTypes.DressRange.Casual:
      return strings.DRESS_RANGE_CASUAL

    default:
      return ''
  }
}
