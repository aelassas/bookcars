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

import { toast } from 'react-toastify'
import validator from 'validator'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/dresses'
import env from '@/config/env.config'
import * as UserService from '@/services/UserService'
