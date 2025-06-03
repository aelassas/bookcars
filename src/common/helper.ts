import { toast } from 'react-toastify'
import validator from 'validator'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/dresses'
import env from '@/config/env.config'
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
 * Get dress type label.
 *
 * @param {string} type
 * @returns {string}
 */
export const getDressType = (type: string) => {
  switch (type) {
    case bookcarsTypes.DressType.Traditional:
      return strings.TRADITIONAL

    case bookcarsTypes.DressType.Modern:
      return strings.MODERN

    case bookcarsTypes.DressType.Designer:
      return strings.DESIGNER

    case bookcarsTypes.DressType.Vintage:
      return strings.VINTAGE

    case bookcarsTypes.DressType.Casual:
      return strings.CASUAL

    case bookcarsTypes.DressType.Unknown:
      return strings.UNKNOWN

    default:
      return ''
  }
}

/**
 * Get short dress type label.
 *
 * @param {string} type
 * @returns {string}
 */
export const getDressTypeShort = (type: string) => {
  switch (type) {
    case bookcarsTypes.DressType.Traditional:
      return strings.TRADITIONAL_SHORT

    case bookcarsTypes.DressType.Modern:
      return strings.MODERN_SHORT

    case bookcarsTypes.DressType.Designer:
      return strings.DESIGNER_SHORT

    case bookcarsTypes.DressType.Vintage:
      return strings.VINTAGE_SHORT

    case bookcarsTypes.DressType.Casual:
      return strings.CASUAL_SHORT

    case bookcarsTypes.DressType.Unknown:
      return strings.UNKNOWN_SHORT

    default:
      return ''
  }
}

/**
 * Get dress size label.
 *
 * @param {string} size
 * @returns {string}
 */
export const getDressSize = (size: string) => {
  switch (size) {
    case bookcarsTypes.DressSize.Small:
      return strings.SIZE_S

    case bookcarsTypes.DressSize.Medium:
      return strings.SIZE_M

    case bookcarsTypes.DressSize.Large:
      return strings.SIZE_L

    case bookcarsTypes.DressSize.ExtraLarge:
      return strings.SIZE_XL

    default:
      return ''
  }
}

/**
 * Get dress material label.
 *
 * @param {string} material
 * @returns {string}
 */
export const getDressMaterial = (material: string) => {
  switch (material) {
    case bookcarsTypes.DressMaterial.Silk:
      return strings.SILK

    case bookcarsTypes.DressMaterial.Cotton:
      return strings.COTTON

    case bookcarsTypes.DressMaterial.Lace:
      return strings.LACE

    case bookcarsTypes.DressMaterial.Satin:
      return strings.SATIN

    case bookcarsTypes.DressMaterial.Chiffon:
      return strings.CHIFFON

    default:
      return ''
  }
}

/**
 * Get dress type tooltip.
 *
 * @param {string} type
 * @returns {string}
 */
export const getDressTypeTooltip = (type: string) => {
  switch (type) {
    case bookcarsTypes.DressType.Traditional:
      return strings.TRADITIONAL_TOOLTIP

    case bookcarsTypes.DressType.Modern:
      return strings.MODERN_TOOLTIP

    case bookcarsTypes.DressType.Designer:
      return strings.DESIGNER_TOOLTIP

    case bookcarsTypes.DressType.Vintage:
      return strings.VINTAGE_TOOLTIP

    case bookcarsTypes.DressType.Casual:
      return strings.CASUAL_TOOLTIP

    case bookcarsTypes.DressType.Unknown:
      return strings.UNKNOWN_TOOLTIP

    default:
      return ''
  }
}

/**
 * Get dress size tooltip.
 *
 * @param {string} size
 * @returns {string}
 */
export const getDressSizeTooltip = (size: string) => {
  switch (size) {
    case bookcarsTypes.DressSize.Small:
      return strings.SIZE_S_TOOLTIP

    case bookcarsTypes.DressSize.Medium:
      return strings.SIZE_M_TOOLTIP

    case bookcarsTypes.DressSize.Large:
      return strings.SIZE_L_TOOLTIP

    case bookcarsTypes.DressSize.ExtraLarge:
      return strings.SIZE_XL_TOOLTIP

    default:
      return ''
  }
}

/**
 * Get dress material tooltip.
 *
 * @param {string} material
 * @returns {string}
 */
export const getDressMaterialTooltip = (material: string) => {
  switch (material) {
    case bookcarsTypes.DressMaterial.Silk:
      return strings.SILK_TOOLTIP

    case bookcarsTypes.DressMaterial.Cotton:
      return strings.COTTON_TOOLTIP

    case bookcarsTypes.DressMaterial.Lace:
      return strings.LACE_TOOLTIP

    case bookcarsTypes.DressMaterial.Satin:
      return strings.SATIN_TOOLTIP

    case bookcarsTypes.DressMaterial.Chiffon:
      return strings.CHIFFON_TOOLTIP

    default:
      return ''
  }
}

/**
 * Get additional driver label.
 *
 * @param {number} additionalDriver
 * @param {string} language
 * @returns {string}
 */
export const getAdditionalDriver = (additionalDriver: number, language: string) => {
  const fr = bookcarsHelper.isFrench(language)

  if (additionalDriver === -1) {
    return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (additionalDriver === 0) {
    return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.INCLUDED}`
  }
  return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(additionalDriver, commonStrings.CURRENCY, language)}${commonStrings.DAILY}`
}

/**
 * Get amendments label.
 *
 * @param {number} amendments
 * @param {string} language
 * @returns {string}
 */
export const getAmendments = (amendments: number, language: string) => {
  const fr = bookcarsHelper.isFrench(language)

  if (amendments === -1) {
    return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}${fr ? 's' : ''}`
  } if (amendments === 0) {
    return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'es' : ''}`
  }
  return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(amendments, commonStrings.CURRENCY, language)}`
}

/**
 * Get cancellation label.
 *
 * @param {number} cancellation
 * @param {string} language
 * @returns {string}
 */
export const getCancellation = (cancellation: number, language: string) => {
  const fr = bookcarsHelper.isFrench(language)

  if (cancellation === -1) {
    return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (cancellation === 0) {
    return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(cancellation, commonStrings.CURRENCY, language)}`
}

/**
 * Check whether a user is and admin or not.
 *
 * @param {?bookcarsTypes.User} [user]
 * @returns {boolean}
 */
export const admin = (user?: bookcarsTypes.User | null): boolean => (user && user.type === bookcarsTypes.RecordType.Admin) || false

/**
 * Get all user types.
 *
 * @returns {{}}
 */
export const getUserTypes = () => [
  {
    value: bookcarsTypes.UserType.Admin,
    label: commonStrings.RECORD_TYPE_ADMIN
  },
  {
    value: bookcarsTypes.UserType.Supplier,
    label: commonStrings.RECORD_TYPE_SUPPLIER,
  },
  {
    value: bookcarsTypes.UserType.User,
    label: commonStrings.RECORD_TYPE_USER
  },
]

/**
 * Get user type label.
 *
 * @param {string} status
 * @returns {string}
 */
export const getUserType = (status?: bookcarsTypes.UserType) => {
  switch (status) {
    case bookcarsTypes.UserType.Admin:
      return commonStrings.RECORD_TYPE_ADMIN

    case bookcarsTypes.UserType.Supplier:
      return commonStrings.RECORD_TYPE_SUPPLIER

    case bookcarsTypes.UserType.User:
      return commonStrings.RECORD_TYPE_USER

    default:
      return ''
  }
}

/**
 * Get days label.
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
 * @param {boolean} hidePlus
 * @returns {string}
 */
export const getCancellationOption = (cancellation: number, language: string, hidePlus: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (cancellation === -1) {
    return strings.UNAVAILABLE
  } if (cancellation === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(cancellation, commonStrings.CURRENCY, language)}`
}

/**
 * Get amendments option label.
 *
 * @param {number} amendments
 * @param {string} language
 * @param {boolean} hidePlus
 * @returns {string}
 */
export const getAmendmentsOption = (amendments: number, language: string, hidePlus: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (amendments === -1) {
    return `${strings.UNAVAILABLE}${fr ? 's' : ''}`
  } if (amendments === 0) {
    return `${strings.INCLUDED}${fr ? 'es' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(amendments, commonStrings.CURRENCY, language)}`
}

/**
 * Get additional driver option label.
 *
 * @param {number} additionalDriver
 * @param {number} days
 * @param {string} language
 * @param {boolean} hidePlus
 * @returns {string}
 */
export const getAdditionalDriverOption = (additionalDriver: number, days: number, language: string, hidePlus: boolean) => {
  if (additionalDriver === -1) {
    return strings.UNAVAILABLE
  } if (additionalDriver === 0) {
    return strings.INCLUDED
  }
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(additionalDriver * days, commonStrings.CURRENCY, language)} (${bookcarsHelper.formatPrice(additionalDriver, commonStrings.CURRENCY, language)}${commonStrings.DAILY})`
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
 * Validate URL string.
 *
 * @param {string} url
 * @returns {boolean}
 */
export const isValidURL = (url: string) => validator.isURL(url, { protocols: ['http', 'https'] })

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
 * Check whether a user is a supplier or not.
 *
 * @param {?bookcarsTypes.User} [user]
 * @returns {boolean}
 */
export const supplier = (user?: bookcarsTypes.User | null): boolean => (user && user.type === bookcarsTypes.RecordType.Supplier) || false

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
 * Get booking status background color.
 *
 * @param {string} status
 * @returns {string}
 */
export const getBookingStatusBackgroundColor = (status?: bookcarsTypes.BookingStatus) => {
  switch (status) {
    case bookcarsTypes.BookingStatus.Void:
      return '#D9D9D9'

    case bookcarsTypes.BookingStatus.Pending:
      return '#FBDCC2'

    case bookcarsTypes.BookingStatus.Deposit:
      return '#CDECDA'

    case bookcarsTypes.BookingStatus.Paid:
      return '#D1F9D1'

    case bookcarsTypes.BookingStatus.Reserved:
      return '#D9E7F4'

    case bookcarsTypes.BookingStatus.Cancelled:
      return '#FBDFDE'

    default:
      return ''
  }
}

/**
 * Get booking status text color.
 *
 * @param {string} status
 * @returns {string}
 */
export const getBookingStatusTextColor = (status?: bookcarsTypes.BookingStatus) => {
  switch (status) {
    case bookcarsTypes.BookingStatus.Void:
      return '#6E7C86'

    case bookcarsTypes.BookingStatus.Pending:
      return '#EF6C00'

    case bookcarsTypes.BookingStatus.Deposit:
      return '#3CB371'

    case bookcarsTypes.BookingStatus.Paid:
      return '#77BC23'

    case bookcarsTypes.BookingStatus.Reserved:
      return '#1E88E5'

    case bookcarsTypes.BookingStatus.Cancelled:
      return '#E53935'

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
