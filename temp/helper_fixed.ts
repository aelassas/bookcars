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
 * Check whether a user is a supplier or not.
 *
 * @param {?bookcarsTypes.User} [user]
 * @returns {boolean}
 */
export const supplier = (user?: bookcarsTypes.User | null): boolean => (user && user.type === bookcarsTypes.RecordType.Supplier) || false
