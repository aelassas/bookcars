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
 * Get car type label.
 *
 * @param {string} type
 * @returns {string}
 */
export const getCarType = (type: string) => {
  switch (type) {
    case bookcarsTypes.CarType.Diesel:
      return strings.DIESEL

    case bookcarsTypes.CarType.Gasoline:
      return strings.GASOLINE

    default:
      return ''
  }
}

/**
 * Get short car type label.
 *
 * @param {string} type
 * @returns {string}
 */
export const getCarTypeShort = (type: string) => {
  switch (type) {
    case bookcarsTypes.CarType.Diesel:
      return strings.DIESEL_SHORT

    case bookcarsTypes.CarType.Gasoline:
      return strings.GASOLINE_SHORT

    case bookcarsTypes.CarType.Electric:
      return strings.ELECTRIC_SHORT

    case bookcarsTypes.CarType.Hybrid:
      return strings.HYBRID_SHORT

    case bookcarsTypes.CarType.PlugInHybrid:
      return strings.PLUG_IN_HYBRID_SHORT

    default:
      return ''
  }
}

/**
 * Get gearbox type label.
 *
 * @param {string} type
 * @returns {string}
 */
export const getGearboxType = (type: string) => {
  switch (type) {
    case bookcarsTypes.GearboxType.Manual:
      return strings.GEARBOX_MANUAL

    case bookcarsTypes.GearboxType.Automatic:
      return strings.GEARBOX_AUTOMATIC

    default:
      return ''
  }
}

/**
 * Get short gearbox type label.
 *
 * @param {string} type
 * @returns {string}
 */
export const getGearboxTypeShort = (type: string) => {
  switch (type) {
    case bookcarsTypes.GearboxType.Manual:
      return strings.GEARBOX_MANUAL_SHORT

    case bookcarsTypes.GearboxType.Automatic:
      return strings.GEARBOX_AUTOMATIC_SHORT

    default:
      return ''
  }
}

/**
 * Get fuel policy label.
 *
 * @param {string} type
 * @returns {string}
 */
export const getFuelPolicy = (type: string) => {
  switch (type) {
    case bookcarsTypes.FuelPolicy.LikeForLike:
      return strings.FUEL_POLICY_LIKE_FOR_LIKE

    case bookcarsTypes.FuelPolicy.FreeTank:
      return strings.FUEL_POLICY_FREE_TANK

    case bookcarsTypes.FuelPolicy.FullToFull:
      return strings.FUEL_POLICY_FULL_TO_FULL

    case bookcarsTypes.FuelPolicy.FullToEmpty:
      return strings.FUEL_POLICY_FULL_TO_EMPTY

    default:
      return ''
  }
}

/**
 * Get car type tooltip.
 *
 * @param {string} type
 * @returns {string}
 */
export const getCarTypeTooltip = (type: string) => {
  switch (type) {
    case bookcarsTypes.CarType.Diesel:
      return strings.DIESEL_TOOLTIP

    case bookcarsTypes.CarType.Gasoline:
      return strings.GASOLINE_TOOLTIP

    case bookcarsTypes.CarType.Electric:
      return strings.ELECTRIC_TOOLTIP

    case bookcarsTypes.CarType.Hybrid:
      return strings.HYBRID_TOOLTIP

    case bookcarsTypes.CarType.PlugInHybrid:
      return strings.PLUG_IN_HYBRID_TOOLTIP

    default:
      return ''
  }
}

/**
 * Get gearbox tooltip.
 *
 * @param {string} type
 * @returns {string}
 */
export const getGearboxTooltip = (type: string) => {
  switch (type) {
    case bookcarsTypes.GearboxType.Manual:
      return strings.GEARBOX_MANUAL_TOOLTIP

    case bookcarsTypes.GearboxType.Automatic:
      return strings.GEARBOX_AUTOMATIC_TOOLTIP

    default:
      return ''
  }
}

/**
 * Get seats tooltip.
 *
 * @param {number} seats
 * @returns {string}
 */
export const getSeatsTooltip = (seats: number) => `${strings.SEATS_TOOLTIP_1}${seats} ${strings.SEATS_TOOLTIP_2}`

/**
 * Get doors tooltip.
 *
 * @param {number} doors
 * @returns {string}
 */
export const getDoorsTooltip = (doors: number) => `${strings.DOORS_TOOLTIP_1}${doors} ${strings.DOORS_TOOLTIP_2}`

/**
 * Get fuel policy tooltip.
 *
 * @param {string} fuelPolicy
 * @returns {string}
 */
export const getFuelPolicyTooltip = (fuelPolicy: string) => {
  switch (fuelPolicy) {
    case bookcarsTypes.FuelPolicy.LikeForLike:
      return strings.FUEL_POLICY_LIKE_FOR_LIKE_TOOLTIP

    case bookcarsTypes.FuelPolicy.FreeTank:
      return strings.FUEL_POLICY_FREE_TANK_TOOLTIP

    case bookcarsTypes.FuelPolicy.FullToFull:
      return strings.FUEL_POLICY_FULL_TO_FULL_TOOLTIP

    case bookcarsTypes.FuelPolicy.FullToEmpty:
      return strings.FUEL_POLICY_FULL_TO_EMPTY_TOOLTIP

    default:
      return ''
  }
}

/**
 * Get mileage label.
 *
 * @param {number} mileage
 * @param {string} language
 * @returns {string}
 */
export const getMileage = (mileage: number, language: string) => {
  if (mileage === -1) {
    return strings.UNLIMITED
  }
  return `${bookcarsHelper.formatNumber(mileage, language)} ${strings.MILEAGE_UNIT}`
}

/**
 * Get mileage tooltip.
 *
 * @param {number} mileage
 * @param {string} language
 * @returns {string}
 */
export const getMileageTooltip = (mileage: number, language: string) => {
  const fr = bookcarsHelper.isFrench(language)

  if (mileage === -1) {
    return `${strings.MILEAGE} ${strings.UNLIMITED.toLocaleLowerCase()}.`
  }
  return `${strings.MILEAGE}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(mileage, language)} ${strings.MILEAGE_UNIT}`
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
 * Get full insurance label.
 *
 * @param {number} fullInsurance
 * @param {string} language
 * @returns {string}
 */
export const getFullInsurance = async (fullInsurance: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (fullInsurance === -1) {
    return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (fullInsurance === 0) {
    return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  let _fullInsurance = await PaymentService.convertPrice(fullInsurance)
  _fullInsurance += _fullInsurance * (priceChangeRate / 100)
  return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_fullInsurance, commonStrings.CURRENCY, language)}${commonStrings.DAILY}`
}

/**
 * Get collision damage waiver label.
 *
 * @param {number} collisionDamageWaiver
 * @param {string} language
 * @returns {string}
 */
export const getCollisionDamageWaiver = async (collisionDamageWaiver: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (collisionDamageWaiver === -1) {
    return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (collisionDamageWaiver === 0) {
    return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  let _collisionDamageWaiver = await PaymentService.convertPrice(collisionDamageWaiver)
  _collisionDamageWaiver += _collisionDamageWaiver * (priceChangeRate / 100)
  return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_collisionDamageWaiver, commonStrings.CURRENCY, language)}${commonStrings.DAILY}`
}

/**
 * Get theft protection label.
 *
 * @param {number} theftProtection
 * @param {string} language
 * @returns {string}
 */
export const getTheftProtection = async (theftProtection: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (theftProtection === -1) {
    return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (theftProtection === 0) {
    return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  let _theftProtection = await PaymentService.convertPrice(theftProtection)
  _theftProtection += _theftProtection * (priceChangeRate / 100)
  return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_theftProtection, commonStrings.CURRENCY, language)}${commonStrings.DAILY}`
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

    case bookcarsTypes.BookingStatus.PaidInFull:
      return commonStrings.BOOKING_STATUS_PAID_IN_FULL

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
    value: bookcarsTypes.BookingStatus.PaidInFull,
    label: commonStrings.BOOKING_STATUS_PAID_IN_FULL,
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
 * Get theft protection option label.
 *
 * @param {number} theftProtection
 * @param {number} days
 * @param {string} language
 * @param {number} priceChangeRate
 * @returns {string}
 */
export const getTheftProtectionOption = async (theftProtection: number, days: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (theftProtection === -1) {
    return strings.UNAVAILABLE
  } if (theftProtection === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  let _theftProtection = await PaymentService.convertPrice(theftProtection)
  _theftProtection += _theftProtection * (priceChangeRate / 100)
  return `+ ${bookcarsHelper.formatPrice(_theftProtection * days, commonStrings.CURRENCY, language)} (${bookcarsHelper.formatPrice(_theftProtection, commonStrings.CURRENCY, language)}${commonStrings.DAILY})`
}

/**
 * Get collision damage waiver option label.
 *
 * @param {number} collisionDamageWaiver
 * @param {number} days
 * @param {string} language
 * @param {number} priceChangeRate
 * @returns {string}
 */
export const getCollisionDamageWaiverOption = async (collisionDamageWaiver: number, days: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (collisionDamageWaiver === -1) {
    return strings.UNAVAILABLE
  } if (collisionDamageWaiver === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  let _collisionDamageWaiver = await PaymentService.convertPrice(collisionDamageWaiver)
  _collisionDamageWaiver += _collisionDamageWaiver * (priceChangeRate / 100)
  return `+ ${bookcarsHelper.formatPrice(_collisionDamageWaiver * days, commonStrings.CURRENCY, language)} (${bookcarsHelper.formatPrice(_collisionDamageWaiver, commonStrings.CURRENCY, language)}${commonStrings.DAILY})`
}

/**
 * Get full insurance option label.
 *
 * @param {number} fullInsurance
 * @param {number} days
 * @param {string} language
 * @param {number} priceChangeRate
 * @returns {string}
 */
export const getFullInsuranceOption = async (fullInsurance: number, days: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (fullInsurance === -1) {
    return strings.UNAVAILABLE
  } if (fullInsurance === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  let _fullInsurance = await PaymentService.convertPrice(fullInsurance)
  _fullInsurance += _fullInsurance * (priceChangeRate / 100)
  return `+ ${bookcarsHelper.formatPrice(_fullInsurance * days, commonStrings.CURRENCY, language)} (${bookcarsHelper.formatPrice(_fullInsurance, commonStrings.CURRENCY, language)}${commonStrings.DAILY})`
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
 * Check whether a car option is available or not.
 *
 * @param {(bookcarsTypes.Car | undefined)} car
 * @param {string} option
 * @returns {boolean}
 */
export const carOptionAvailable = (car: bookcarsTypes.Car | undefined, option: string) =>
  car && option in car && (car[option] as number) > -1

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
 * Get car range label.
 *
 * @param {string} range
 * @returns {string}
 */
export const getCarRange = (range: bookcarsTypes.CarRange) => {
  switch (range) {
    case bookcarsTypes.CarRange.Mini:
      return strings.CAR_RANGE_MINI

    case bookcarsTypes.CarRange.Midi:
      return strings.CAR_RANGE_MIDI

    case bookcarsTypes.CarRange.Maxi:
      return strings.CAR_RANGE_MAXI

    case bookcarsTypes.CarRange.Scooter:
      return strings.CAR_RANGE_SCOOTER

    case bookcarsTypes.CarRange.Bus:
      return strings.CAR_RANGE_BUS

    case bookcarsTypes.CarRange.Truck:
      return strings.CAR_RANGE_TRUCK

    case bookcarsTypes.CarRange.Caravan:
      return strings.CAR_RANGE_CARAVAN

    default:
      return ''
  }
}
