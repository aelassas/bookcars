import { toast } from 'react-toastify'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'
import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/cars'
import * as CarService from '../services/CarService'
import env from '../config/env.config'

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
  toast(message, { type: 'info' })
}

/**
 * Toast error message.
 *
 * @param {?unknown} [err]
 * @param {?string} [message]
 */
export const error = (err?: unknown, message?: string) => {
  if (err && console && console.error) {
    console.error(err)
  }
  if (message) {
    toast(message, { type: 'error' })
  } else {
    toast(commonStrings.GENERIC_ERROR, { type: 'error' })
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
    case bookcarsTypes.FuelPolicy.LikeForlike:
      return strings.FUEL_POLICY_LIKE_FOR_LIKE

    case bookcarsTypes.FuelPolicy.FreeTank:
      return strings.FUEL_POLICY_FREE_TANK

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
    case bookcarsTypes.FuelPolicy.LikeForlike:
      return strings.FUEL_POLICY_LIKE_FOR_LIKE_TOOLTIP

    case bookcarsTypes.FuelPolicy.FreeTank:
      return strings.FUEL_POLICY_FREE_TANK_TOOLTIP

    default:
      return ''
  }
}

/**
 * Get mileage label.
 *
 * @param {number} mileage
 * @returns {string}
 */
export const getMileage = (mileage: number) => {
  if (mileage === -1) {
    return strings.UNLIMITED
  }
  return `${bookcarsHelper.formatNumber(mileage)} ${strings.MILEAGE_UNIT}`
}

/**
 * Get mileage tooltip.
 *
 * @param {number} mileage
 * @param {boolean} fr
 * @returns {string}
 */
export const getMileageTooltip = (mileage: number, fr: boolean) => {
  if (mileage === -1) {
    return `${strings.MILEAGE} ${strings.UNLIMITED.toLocaleLowerCase()}.`
  }
  return `${strings.MILEAGE}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(mileage)} ${strings.MILEAGE_UNIT}`
}

/**
 * Get additional driver label.
 *
 * @param {number} additionalDriver
 * @param {boolean} fr
 * @returns {string}
 */
export const getAdditionalDriver = (additionalDriver: number, fr: boolean) => {
  if (additionalDriver === -1) {
    return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (additionalDriver === 0) {
    return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.INCLUDED}`
  }
  return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(additionalDriver)} ${strings.CAR_CURRENCY}`
}

/**
 * Get full insurance label.
 *
 * @param {number} fullInsurance
 * @param {boolean} fr
 * @returns {string}
 */
export const getFullInsurance = (fullInsurance: number, fr: boolean) => {
  if (fullInsurance === -1) {
    return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (fullInsurance === 0) {
    return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(fullInsurance)} ${strings.CAR_CURRENCY}`
}

/**
 * Get collision damage waiver label.
 *
 * @param {number} collisionDamageWaiver
 * @param {boolean} fr
 * @returns {string}
 */
export const getCollisionDamageWaiver = (collisionDamageWaiver: number, fr: boolean) => {
  if (collisionDamageWaiver === -1) {
    return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (collisionDamageWaiver === 0) {
    return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(collisionDamageWaiver)} ${strings.CAR_CURRENCY}`
}

/**
 * Get theft protection label.
 *
 * @param {number} theftProtection
 * @param {boolean} fr
 * @returns {string}
 */
export const getTheftProtection = (theftProtection: number, fr: boolean) => {
  if (theftProtection === -1) {
    return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (theftProtection === 0) {
    return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(theftProtection)} ${strings.CAR_CURRENCY}`
}

/**
 * Get amendments label.
 *
 * @param {number} amendments
 * @param {boolean} fr
 * @returns {string}
 */
export const getAmendments = (amendments: number, fr: boolean) => {
  if (amendments === -1) {
    return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}${fr ? 's' : ''}`
  } if (amendments === 0) {
    return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'es' : ''}`
  }
  return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(amendments)} ${commonStrings.CURRENCY}`
}

/**
 * Get cancellation label.
 *
 * @param {number} cancellation
 * @param {boolean} fr
 * @returns {string}
 */
export const getCancellation = (cancellation: number, fr: boolean) => {
  if (cancellation === -1) {
    return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } if (cancellation === 0) {
    return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(cancellation)} ${commonStrings.CURRENCY}`
}

/**
 * Check whether a user is and administrator or not.
 *
 * @param {?bookcarsTypes.User} [user]
 * @returns {boolean}
 */
export const admin = (user?: bookcarsTypes.User): boolean => (user && user.type === bookcarsTypes.RecordType.Admin) ?? false

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
 * Get price.
 *
 * @async
 * @param {bookcarsTypes.Booking} booking
 * @param {(bookcarsTypes.Car | undefined | null)} car
 * @param {(price: number) => void} onSucess
 * @param {(err: unknown) => void} onError
 * @returns {void, onError: (err: unknown) => void) => any}
 */
export const price = async (
  booking: bookcarsTypes.Booking,
  car: bookcarsTypes.Car | undefined | null,
  onSucess: (_price: number) => void,
  onError: (err: unknown) => void
) => {
  const totalDays = (date1: Date, date2: Date) => Math.ceil((date2.getTime() - date1.getTime()) / (1000 * 3600 * 24))

  try {
    if (!car) {
      car = await CarService.getCar(booking.car as string)
    }

    if (car) {
      const from = new Date(booking.from)
      const to = new Date(booking.to)
      const days = totalDays(from, to)

      let _price = car.price * days
      if (booking.cancellation && car.cancellation > 0) {
        _price += car.cancellation
      }
      if (booking.amendments && car.amendments > 0) {
        _price += car.amendments
      }
      if (booking.theftProtection && car.theftProtection > 0) {
        _price += car.theftProtection * days
      }
      if (booking.collisionDamageWaiver && car.collisionDamageWaiver > 0) {
        _price += car.collisionDamageWaiver * days
      }
      if (booking.fullInsurance && car.fullInsurance > 0) {
        _price += car.fullInsurance * days
      }
      if (booking.additionalDriver && car.additionalDriver > 0) {
        _price += car.additionalDriver * days
      }

      if (onSucess) {
        onSucess(_price)
      }
    } else if (onError) {
      onError(`Car ${booking.car} not found.`)
    }
  } catch (err) {
    if (onError) {
      onError(err)
    }
  }
}

/**
 * Get all user type;s.
 *
 * @returns {{}}
 */
export const getUserTypes = () => [
  {
    value: bookcarsTypes.UserType.Admin,
    label: commonStrings.RECORD_TYPE_ADMIN
  },
  {
    value: bookcarsTypes.UserType.Company,
    label: commonStrings.RECORD_TYPE_COMPANY,
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

    case bookcarsTypes.UserType.Company:
      return commonStrings.RECORD_TYPE_COMPANY

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
 * @param {boolean} fr
 * @param {boolean} hidePlus
 * @returns {string}
 */
export const getCancellationOption = (cancellation: number, fr: boolean, hidePlus: boolean) => {
  if (cancellation === -1) {
    return strings.UNAVAILABLE
  } if (cancellation === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${cancellation} ${commonStrings.CURRENCY}`
}

/**
 * Get amendments option label.
 *
 * @param {number} amendments
 * @param {boolean} fr
 * @param {boolean} hidePlus
 * @returns {string}
 */
export const getAmendmentsOption = (amendments: number, fr: boolean, hidePlus: boolean) => {
  if (amendments === -1) {
    return `${strings.UNAVAILABLE}${fr ? 's' : ''}`
  } if (amendments === 0) {
    return `${strings.INCLUDED}${fr ? 'es' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${amendments} ${commonStrings.CURRENCY}`
}

/**
 * Get collision damage waiver option label.
 *
 * @param {number} collisionDamageWaiver
 * @param {number} days
 * @param {boolean} fr
 * @param {boolean} hidePlus
 * @returns {string}
 */
export const getCollisionDamageWaiverOption = (collisionDamageWaiver: number, days: number, fr: boolean, hidePlus: boolean) => {
  if (collisionDamageWaiver === -1) {
    return strings.UNAVAILABLE
  } if (collisionDamageWaiver === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${collisionDamageWaiver * days} ${commonStrings.CURRENCY} (${collisionDamageWaiver} ${strings.CAR_CURRENCY})`
}

/**
 * Get theft protection option label.
 *
 * @param {number} theftProtection
 * @param {number} days
 * @param {boolean} fr
 * @param {boolean} hidePlus
 * @returns {string}
 */
export const getTheftProtectionOption = (theftProtection: number, days: number, fr: boolean, hidePlus: boolean) => {
  if (theftProtection === -1) {
    return strings.UNAVAILABLE
  } if (theftProtection === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${theftProtection * days} ${commonStrings.CURRENCY} (${theftProtection} ${strings.CAR_CURRENCY})`
}

/**
 * Get full insurance option label.
 *
 * @param {number} fullInsurance
 * @param {number} days
 * @param {boolean} fr
 * @param {boolean} hidePlus
 * @returns {string}
 */
export const getFullInsuranceOption = (fullInsurance: number, days: number, fr: boolean, hidePlus: boolean) => {
  if (fullInsurance === -1) {
    return strings.UNAVAILABLE
  } if (fullInsurance === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${fullInsurance * days} ${commonStrings.CURRENCY} (${fullInsurance} ${strings.CAR_CURRENCY})`
}

/**
 * Get additional driver option label.
 *
 * @param {number} additionalDriver
 * @param {number} days
 * @param {boolean} fr
 * @param {boolean} hidePlus
 * @returns {string}
 */
export const getAdditionalDriverOption = (additionalDriver: number, days: number, fr: boolean, hidePlus: boolean) => {
  if (additionalDriver === -1) {
    return strings.UNAVAILABLE
  } if (additionalDriver === 0) {
    return strings.INCLUDED
  }
  return `${hidePlus ? '' : '+ '}${additionalDriver * days} ${commonStrings.CURRENCY} (${additionalDriver} ${strings.CAR_CURRENCY})`
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
