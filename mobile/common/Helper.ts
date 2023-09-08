import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'

import i18n from '../lang/i18n'
import * as UserService from '../services/UserService'
import * as mime from 'mime'
import * as bookcarsTypes from '../miscellaneous/bookcarsTypes'
import * as bookcarsHelper from '../miscellaneous/bookcarsHelper'
import * as ToasHelper from './ToastHelper'

const ANDROID = Platform.OS === 'android'

export const android = () => ANDROID

export const toast = (message: string) => {
  ToasHelper.toast(message)
}

export const error = (err?: unknown, __toast__ = true) => {
  ToasHelper.error(err, __toast__)
}


export const getFileName = (path: string) => path.replace(/^.*[\\/]/, '')

export const getMimeType = (fileName: string) => mime.getType(fileName)

export const registerPushToken = async (userId: string) => {
  async function registerForPushNotificationsAsync() {
    let token

    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync()
        let finalStatus = existingStatus
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync()
          finalStatus = status
        }
        if (finalStatus !== 'granted') {
          alert('Failed to get push token for push notification!')
          return
        }
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
          })
        ).data
      } else {
        alert('Must use physical device for Push Notifications')
      }

      if (android()) {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        })
      }
    } catch (err) {
      error(err, false)
    }

    return token
  }

  try {
    await UserService.deletePushToken(userId)
    const token = await registerForPushNotificationsAsync()

    if (token) {
      const status = await UserService.createPushToken(userId, token)
      if (status !== 200) {
        error()
      }
    } else {
      error()
    }
  } catch (err) {
    error(err, false)
  }
}

export const dateTime = (date: Date, time: Date) => {
  const dateTime = new Date(date)
  dateTime.setHours(time.getHours())
  dateTime.setMinutes(time.getMinutes())
  dateTime.setSeconds(time.getSeconds())
  dateTime.setMilliseconds(time.getMilliseconds())
  return dateTime
}

export const getCarTypeShort = (type: string) => {
  switch (type) {
    case bookcarsTypes.CarType.Diesel:
      return i18n.t('DIESEL_SHORT')

    case bookcarsTypes.CarType.Gasoline:
      return i18n.t('GASOLINE_SHORT')

    default:
      return ''
  }
}

export const getGearboxTypeShort = (type: string) => {
  switch (type) {
    case bookcarsTypes.GearboxType.Manual:
      return i18n.t('GEARBOX_MANUAL_SHORT')

    case bookcarsTypes.GearboxType.Automatic:
      return i18n.t('GEARBOX_AUTOMATIC_SHORT')

    default:
      return ''
  }
}

export const getMileage = (mileage: number) => {
  if (mileage === -1) {
    return i18n.t('UNLIMITED')
  } else {
    return `${bookcarsHelper.formatNumber(mileage)} ${i18n.t('MILEAGE_UNIT')}`
  }
}

export const getFuelPolicy = (type: string) => {
  switch (type) {
    case bookcarsTypes.FuelPolicy.LikeForlike:
      return i18n.t('FUEL_POLICY_LIKE_FOR_LIKE')

    case bookcarsTypes.FuelPolicy.FreeTank:
      return i18n.t('FUEL_POLICY_FREE_TANK')

    default:
      return ''
  }
}

export const getCancellation = (cancellation: number, fr: boolean) => {
  if (cancellation === -1) {
    return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } else if (cancellation === 0) {
    return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  } else {
    return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(cancellation)} ${i18n.t('CURRENCY')}`
  }
}

export const getAmendments = (amendments: number, fr: boolean) => {
  if (amendments === -1) {
    return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}${fr ? 's' : ''}`
  } else if (amendments === 0) {
    return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'es' : ''}`
  } else {
    return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(amendments)} ${i18n.t('CURRENCY')}`
  }
}

export const getTheftProtection = (theftProtection: number, fr: boolean) => {
  if (theftProtection === -1) {
    return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } else if (theftProtection === 0) {
    return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  } else {
    return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(theftProtection)} ${i18n.t('CAR_CURRENCY')}`
  }
}

export const getCollisionDamageWaiver = (collisionDamageWaiver: number, fr: boolean) => {
  if (collisionDamageWaiver === -1) {
    return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } else if (collisionDamageWaiver === 0) {
    return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  } else {
    return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(collisionDamageWaiver)} ${i18n.t('CAR_CURRENCY')}`
  }
}

export const getFullInsurance = (fullInsurance: number, fr: boolean) => {
  if (fullInsurance === -1) {
    return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } else if (fullInsurance === 0) {
    return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  } else {
    return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(fullInsurance)} ${i18n.t('CAR_CURRENCY')}`
  }
}

export const getAdditionalDriver = (additionalDriver: number, fr: boolean) => {
  if (additionalDriver === -1) {
    return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } else if (additionalDriver === 0) {
    return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}`
  } else {
    return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${bookcarsHelper.formatNumber(additionalDriver)} ${i18n.t('CAR_CURRENCY')}`
  }
}

export const getDays = (days: number) => {
  return `${i18n.t('PRICE_DAYS_PART_1')} ${days} ${i18n.t('PRICE_DAYS_PART_2')}${days > 1 ? 's' : ''}`
}

export const getDaysShort = (days: number) => {
  return `${days} ${i18n.t('PRICE_DAYS_PART_2')}${days > 1 ? 's' : ''}`
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

export const getCancellationOption = (cancellation: number, fr: boolean, hidePlus?: boolean) => {
  if (cancellation === -1) {
    return i18n.t('UNAVAILABLE')
  } else if (cancellation === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  } else {
    return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatNumber(cancellation)} ${i18n.t('CURRENCY')}`
  }
}

export const getAmendmentsOption = (amendments: number, fr: boolean, hidePlus?: boolean) => {
  if (amendments === -1) {
    return `${i18n.t('UNAVAILABLE')}${fr ? 's' : ''}`
  } else if (amendments === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'es' : ''}`
  } else {
    return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatNumber(amendments)} ${i18n.t('CURRENCY')}`
  }
}

export const getCollisionDamageWaiverOption = (collisionDamageWaiver: number, days: number, fr: boolean, hidePlus?: boolean) => {
  if (collisionDamageWaiver === -1) {
    return i18n.t('UNAVAILABLE')
  } else if (collisionDamageWaiver === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  } else {
    return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatNumber(collisionDamageWaiver * days)} ${i18n.t('CURRENCY')} (${bookcarsHelper.formatNumber(collisionDamageWaiver)} ${i18n.t('CAR_CURRENCY')})`
  }
}

export const getTheftProtectionOption = (theftProtection: number, days: number, fr: boolean, hidePlus?: boolean) => {
  if (theftProtection === -1) {
    return i18n.t('UNAVAILABLE')
  } else if (theftProtection === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  } else {
    return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatNumber(theftProtection * days)} ${i18n.t('CURRENCY')} (${bookcarsHelper.formatNumber(theftProtection)} ${i18n.t('CAR_CURRENCY')})`
  }
}

export const getFullInsuranceOption = (fullInsurance: number, days: number, fr: boolean, hidePlus?: boolean) => {
  if (fullInsurance === -1) {
    return i18n.t('UNAVAILABLE')
  } else if (fullInsurance === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  } else {
    return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatNumber(fullInsurance * days)} ${i18n.t('CURRENCY')} (${bookcarsHelper.formatNumber(fullInsurance)} ${i18n.t('CAR_CURRENCY')})`
  }
}

export const getAdditionalDriverOption = (additionalDriver: number, days: number, fr: boolean, hidePlus?: boolean) => {
  if (additionalDriver === -1) {
    return i18n.t('UNAVAILABLE')
  } else if (additionalDriver === 0) {
    return i18n.t('INCLUDED')
  } else {
    return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatNumber(additionalDriver * days)} ${i18n.t('CURRENCY')} (${bookcarsHelper.formatNumber(additionalDriver)} ${i18n.t('CAR_CURRENCY')})`
  }
}

export const getBookingStatuses = (): bookcarsTypes.StatusFilterItem[] => [
  {
    value: bookcarsTypes.BookingStatus.Void,
    label: i18n.t('BOOKING_STATUS_VOID')
  },
  {
    value: bookcarsTypes.BookingStatus.Pending,
    label: i18n.t('BOOKING_STATUS_PENDING'),
  },
  {
    value: bookcarsTypes.BookingStatus.Deposit,
    label: i18n.t('BOOKING_STATUS_DEPOSIT'),
  },
  {
    value: bookcarsTypes.BookingStatus.Paid,
    label: i18n.t('BOOKING_STATUS_PAID')
  },
  {
    value: bookcarsTypes.BookingStatus.Reserved,
    label: i18n.t('BOOKING_STATUS_RESERVED'),
  },
  {
    value: bookcarsTypes.BookingStatus.Cancelled,
    label: i18n.t('BOOKING_STATUS_CANCELLED'),
  },
]

export const getBookingStatus = (status: string) => {
  switch (status) {
    case bookcarsTypes.BookingStatus.Void:
      return i18n.t('BOOKING_STATUS_VOID')

    case bookcarsTypes.BookingStatus.Pending:
      return i18n.t('BOOKING_STATUS_PENDING')

    case bookcarsTypes.BookingStatus.Deposit:
      return i18n.t('BOOKING_STATUS_DEPOSIT')

    case bookcarsTypes.BookingStatus.Paid:
      return i18n.t('BOOKING_STATUS_PAID')

    case bookcarsTypes.BookingStatus.Reserved:
      return i18n.t('BOOKING_STATUS_RESERVED')

    case bookcarsTypes.BookingStatus.Cancelled:
      return i18n.t('BOOKING_STATUS_CANCELLED')

    default:
      return ''
  }
}

export const getBirthDateError = (minimumAge: number) =>
  `${i18n.t('BIRTH_DATE_NOT_VALID_PART1')} ${minimumAge} ${i18n.t('BIRTH_DATE_NOT_VALID_PART2')} `

export const navigate = (
  route: RouteProp<StackParams, keyof StackParams>,
  navigation: NativeStackNavigationProp<StackParams, keyof StackParams>
): void => {
  switch (route.name) {
    case 'About':
    case 'Bookings':
    case 'ChangePassword':
    case 'Contact':
    case 'ForgotPassword':
    case 'Home':
    case 'Notifications':
    case 'Settings':
    case 'SignIn':
    case 'SignUp':
    case 'ToS':
      navigation.navigate(route.name, { d: new Date().getTime() })
      break
    case 'Booking':
      navigation.navigate(route.name,
        {
          d: new Date().getTime(),
          id: (route.params && 'id' in route.params && route.params.id as string) || '',
        })
      break
    case 'Cars':
      navigation.navigate(route.name,
        {
          d: new Date().getTime(),
          pickupLocation: (route.params && 'pickupLocation' in route.params && route.params.pickupLocation as string) || '',
          dropOffLocation: (route.params && 'dropOffLocation' in route.params && route.params.dropOffLocation as string) || '',
          from: (route.params && 'from' in route.params && route.params.from as number) || 0,
          to: (route.params && 'to' in route.params && route.params.to as number) || 0,
        })
      break
    case 'Checkout':
      navigation.navigate(route.name,
        {
          d: new Date().getTime(),
          car: (route.params && 'car' in route.params && route.params.car as string) || '',
          pickupLocation: (route.params && 'pickupLocation' in route.params && route.params.pickupLocation as string) || '',
          dropOffLocation: (route.params && 'dropOffLocation' in route.params && route.params.dropOffLocation as string) || '',
          from: (route.params && 'from' in route.params && route.params.from as number) || 0,
          to: (route.params && 'to' in route.params && route.params.to as number) || 0,
        })
      break
  }
}
