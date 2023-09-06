import { strings as commonStrings } from '../lang/common'
import { strings } from '../lang/cars'
import { toast } from 'react-toastify'
import * as bookcarsTypes from 'bookcars-types'
import * as bookcarsHelper from 'bookcars-helper'

export const info = (message: string) => {
  toast(message, { type: 'info' })
}

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

export const getSeatsTooltip = (seats: number) => {
  return `${strings.SEATS_TOOLTIP_1}${seats} ${strings.SEATS_TOOLTIP_2}`
}

export const getDoorsTooltip = (doors: number) => {
  return `${strings.DOORS_TOOLTIP_1}${doors} ${strings.DOORS_TOOLTIP_2}`
}

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

export const getMileage = (mileage: number) => {
  if (mileage === -1) {
    return strings.UNLIMITED
  } else {
    return `${bookcarsHelper.formatNumber(mileage)} ${strings.MILEAGE_UNIT}`
  }
}

export const getMileageTooltip = (mileage: number, fr: boolean) => {
  if (mileage === -1) {
    return `${strings.MILEAGE} ${strings.UNLIMITED.toLocaleLowerCase()}.`
  } else {
    return `${strings.MILEAGE}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(mileage)} ${strings.MILEAGE_UNIT}`
  }
}

export const getAdditionalDriver = (additionalDriver: number, fr: boolean) => {
  if (additionalDriver === -1) {
    return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } else if (additionalDriver === 0) {
    return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${strings.INCLUDED}`
  } else {
    return `${strings.ADDITIONAL_DRIVER}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(additionalDriver)} ${strings.CAR_CURRENCY}`
  }
}

export const getFullInsurance = (fullInsurance: number, fr: boolean) => {
  if (fullInsurance === -1) {
    return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } else if (fullInsurance === 0) {
    return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  } else {
    return `${strings.FULL_INSURANCE}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(fullInsurance)} ${strings.CAR_CURRENCY}`
  }
}

export const getCollisionDamageWaiver = (collisionDamageWaiver: number, fr: boolean) => {
  if (collisionDamageWaiver === -1) {
    return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } else if (collisionDamageWaiver === 0) {
    return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  } else {
    return `${strings.COLLISION_DAMAGE_WAVER}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(collisionDamageWaiver)} ${strings.CAR_CURRENCY}`
  }
}

export const getTheftProtection = (theftProtection: number, fr: boolean) => {
  if (theftProtection === -1) {
    return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } else if (theftProtection === 0) {
    return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  } else {
    return `${strings.THEFT_PROTECTION}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(theftProtection)} ${strings.CAR_CURRENCY}`
  }
}

export const getAmendments = (amendments: number, fr: boolean) => {
  if (amendments === -1) {
    return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}${fr ? 's' : ''}`
  } else if (amendments === 0) {
    return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'es' : ''}`
  } else {
    return `${strings.AMENDMENTS}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(amendments)} ${commonStrings.CURRENCY}`
  }
}

export const getCancellation = (cancellation: number, fr: boolean) => {
  if (cancellation === -1) {
    return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.UNAVAILABLE}`
  } else if (cancellation === 0) {
    return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${strings.INCLUDED}${fr ? 'e' : ''}`
  } else {
    return `${strings.CANCELLATION}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(cancellation)} ${commonStrings.CURRENCY}`
  }
}

export const getBookingStatus = (status: string) => {
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

export const getBookingStatuses = (): bookcarsTypes.StatusFilterItem[] => {
  return [
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
}

export const price = (car: bookcarsTypes.Car, from: Date, to: Date, options?: bookcarsTypes.CarOptions) => {
  const _days = bookcarsHelper.days(from, to)

  let price = car.price * _days
  if (options) {
    if (options.cancellation && car.cancellation > 0) {
      price += car.cancellation
    }
    if (options.amendments && car.amendments > 0) {
      price += car.amendments
    }
    if (options.theftProtection && car.theftProtection > 0) {
      price += car.theftProtection * _days
    }
    if (options.collisionDamageWaiver && car.collisionDamageWaiver > 0) {
      price += car.collisionDamageWaiver * _days
    }
    if (options.fullInsurance && car.fullInsurance > 0) {
      price += car.fullInsurance * _days
    }
    if (options.additionalDriver && car.additionalDriver > 0) {
      price += car.additionalDriver * _days
    }
  }

  return price
}

export const getUserTypes = () => {
  return [
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
}

export const getUserType = (status: string) => {
  switch (status) {
    case bookcarsTypes.RecordType.Admin:
      return commonStrings.RECORD_TYPE_ADMIN

    case bookcarsTypes.RecordType.Company:
      return commonStrings.RECORD_TYPE_COMPANY

    case bookcarsTypes.RecordType.User:
      return commonStrings.RECORD_TYPE_USER

    default:
      return ''
  }
}

export const getDays = (days: number) => `${strings.PRICE_DAYS_PART_1} ${days} ${strings.PRICE_DAYS_PART_2}${days > 1 ? 's' : ''}`

export const getDaysShort = (days: number) => `${days} ${strings.PRICE_DAYS_PART_2}${days > 1 ? 's' : ''}`

export const getCancellationOption = (cancellation: number, fr: boolean) => {
  if (cancellation === -1) {
    return strings.UNAVAILABLE
  } else if (cancellation === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  }
}

export const getAmendmentsOption = (amendments: number, fr: boolean) => {
  if (amendments === -1) {
    return `${strings.UNAVAILABLE}${fr ? 's' : ''}`
  } else if (amendments === 0) {
    return `${strings.INCLUDED}${fr ? 'es' : ''}`
  }
}

export const getTheftProtectionOption = (theftProtection: number, days: number, fr: boolean) => {
  if (theftProtection === -1) {
    return strings.UNAVAILABLE
  } else if (theftProtection === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  } else {
    return `+ ${bookcarsHelper.formatNumber(theftProtection * days)} ${commonStrings.CURRENCY} (${bookcarsHelper.formatNumber(theftProtection)} ${strings.CAR_CURRENCY})`
  }
}

export const getCollisionDamageWaiverOption = (collisionDamageWaiver: number, days: number, fr: boolean) => {
  if (collisionDamageWaiver === -1) {
    return strings.UNAVAILABLE
  } else if (collisionDamageWaiver === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  } else {
    return `+ ${bookcarsHelper.formatNumber(collisionDamageWaiver * days)} ${commonStrings.CURRENCY} (${bookcarsHelper.formatNumber(collisionDamageWaiver)} ${strings.CAR_CURRENCY})`
  }
}

export const getFullInsuranceOption = (fullInsurance: number, days: number, fr: boolean) => {
  if (fullInsurance === -1) {
    return strings.UNAVAILABLE
  } else if (fullInsurance === 0) {
    return `${strings.INCLUDED}${fr ? 'e' : ''}`
  } else {
    return `+ ${bookcarsHelper.formatNumber(fullInsurance * days)} ${commonStrings.CURRENCY} (${bookcarsHelper.formatNumber(fullInsurance)} ${strings.CAR_CURRENCY})`
  }
}

export const getAdditionalDriverOption = (additionalDriver: number, days: number) => {
  if (additionalDriver === -1) {
    return strings.UNAVAILABLE
  } else if (additionalDriver === 0) {
    return strings.INCLUDED
  } else {
    return `+ ${bookcarsHelper.formatNumber(additionalDriver * days)} ${commonStrings.CURRENCY} (${bookcarsHelper.formatNumber(additionalDriver)} ${strings.CAR_CURRENCY})`
  }
}

export const getBirthDateError = (minimumAge: number) =>
  `${commonStrings.BIRTH_DATE_NOT_VALID_PART1} ${minimumAge} ${commonStrings.BIRTH_DATE_NOT_VALID_PART2}`

export const carOptionAvailable = (car: bookcarsTypes.Car | undefined, option: string) =>
  car && option in car && (car[option] as number) > -1
