import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'

import mime from 'mime'
import i18n from '../lang/i18n'
import * as UserService from '../services/UserService'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as toastHelper from './toastHelper'

/**
 * Indicate whether Platform OS is Android or not.
 *
 * @returns {boolean}
 */
export const android = () => Platform.OS === 'android'

/**
 * Toast message.
 *
 * @param {string} message
 */
export const toast = (message: string) => {
  toastHelper.toast(message)
}

/**
 * Toast error message.
 *
 * @param {?unknown} [err]
 * @param {boolean} [__toast__=true]
 */
export const error = (err?: unknown, __toast__ = true) => {
  toastHelper.error(err, __toast__)
}

/**
 * Get filename.
 *
 * @param {string} path
 * @returns {string}
 */
export const getFileName = (path: string) => path.replace(/^.*[\\/]/, '')

/**
 * Get MIME type.
 *
 * @param {string} fileName
 * @returns {string|null}
 */
export const getMimeType = (fileName: string) => mime.getType(fileName)

/**
 * Register push token.
 *
 * @async
 * @param {string} userId
 * @returns {void}
 */
export const registerPushToken = async (userId: string) => {
  const registerForPushNotificationsAsync = async () => {
    let token

    try {
      if (android()) {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        })
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync()
        let finalStatus = existingStatus
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync()
          finalStatus = status
        }
        if (finalStatus !== 'granted') {
          alert('Failed to get push token for push notification!')
          return ''
        }
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
          })
        ).data
      } else {
        alert('Must use physical device for Push Notifications')
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

/**
 * Add time to date.
 *
 * @param {Date} date
 * @param {Date} time
 * @returns {Date}
 */
export const dateTime = (date: Date, time: Date) => {
  const _dateTime = new Date(date)
  _dateTime.setHours(time.getHours())
  _dateTime.setMinutes(time.getMinutes())
  _dateTime.setSeconds(time.getSeconds())
  _dateTime.setMilliseconds(time.getMilliseconds())
  return _dateTime
}

/**
 * Get short car type.
 *
 * @param {string} type
 * @returns {string}
 */
export const getCarTypeShort = (type: string) => {
  switch (type) {
    case bookcarsTypes.CarType.Diesel:
      return i18n.t('DIESEL_SHORT')

    case bookcarsTypes.CarType.Gasoline:
      return i18n.t('GASOLINE_SHORT')

    case bookcarsTypes.CarType.Electric:
      return i18n.t('ELECTRIC_SHORT')

    case bookcarsTypes.CarType.Hybrid:
      return i18n.t('HYBRID_SHORT')

    case bookcarsTypes.CarType.PlugInHybrid:
      return i18n.t('PLUG_IN_HYBRID_SHORT')

    default:
      return ''
  }
}

/**
 * Get short gearbox type.
 *
 * @param {string} type
 * @returns {string}
 */
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

/**
 * Get mileage label.
 *
 * @param {number} mileage
 * @param {string} language
 * @returns {string}
 */
export const getMileage = (mileage: number, language: string) => {
  if (mileage === -1) {
    return i18n.t('UNLIMITED')
  }
  return `${bookcarsHelper.formatNumber(mileage, language)} ${i18n.t('MILEAGE_UNIT')}`
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
      return i18n.t('FUEL_POLICY_LIKE_FOR_LIKE')

    case bookcarsTypes.FuelPolicy.FreeTank:
      return i18n.t('FUEL_POLICY_FREE_TANK')

    default:
      return ''
  }
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
    return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } if (cancellation === 0) {
    return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(cancellation, i18n.t('CURRENCY'), language)}`
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
    return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}${fr ? 's' : ''}`
  } if (amendments === 0) {
    return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'es' : ''}`
  }
  return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(amendments, i18n.t('CURRENCY'), language)}`
}

/**
 * Get theft protection label.
 *
 * @param {number} theftProtection
 * @param {string} language
 * @returns {string}
 */
export const getTheftProtection = (theftProtection: number, language: string) => {
  const fr = bookcarsHelper.isFrench(language)

  if (theftProtection === -1) {
    return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } if (theftProtection === 0) {
    return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(theftProtection, i18n.t('CURRENCY'), language)}${i18n.t('DAILY')}`
}

/**
 * Get collision damage waiver label.
 *
 * @param {number} collisionDamageWaiver
 * @param {string} language
 * @returns {string}
 */
export const getCollisionDamageWaiver = (collisionDamageWaiver: number, language: string) => {
  const fr = bookcarsHelper.isFrench(language)

  if (collisionDamageWaiver === -1) {
    return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } if (collisionDamageWaiver === 0) {
    return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(collisionDamageWaiver, i18n.t('CURRENCY'), language)}${i18n.t('DAILY')}`
}

/**
 * Get full insurance label.
 *
 * @param {number} fullInsurance
 * @param {string} language
 * @returns {string}
 */
export const getFullInsurance = (fullInsurance: number, language: string) => {
  const fr = bookcarsHelper.isFrench(language)

  if (fullInsurance === -1) {
    return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } if (fullInsurance === 0) {
    return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(fullInsurance, i18n.t('CURRENCY'), language)}${i18n.t('DAILY')}`
}

/**
 * Get addtional driver label.
 *
 * @param {number} additionalDriver
 * @param {string} language
 * @returns {string}
 */
export const getAdditionalDriver = (additionalDriver: number, language: string) => {
  const fr = bookcarsHelper.isFrench(language)

  if (additionalDriver === -1) {
    return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } if (additionalDriver === 0) {
    return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}`
  }
  return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(additionalDriver, i18n.t('CURRENCY'), language)}${i18n.t('DAILY')}`
}

/**
 * Get days label?
 *
 * @param {number} days
 * @returns {string}
 */
export const getDays = (days: number) => `${i18n.t('PRICE_DAYS_PART_1')} ${days} ${i18n.t('PRICE_DAYS_PART_2')}${days > 1 ? 's' : ''}`

/**
 * Get short days label.
 *
 * @param {number} days
 * @returns {string}
 */
export const getDaysShort = (days: number) => `${days} ${i18n.t('PRICE_DAYS_PART_2')}${days > 1 ? 's' : ''}`

/**
 * Get price.
 *
 * @param {bookcarsTypes.Car} car
 * @param {Date} from
 * @param {Date} to
 * @param {?bookcarsTypes.CarOptions} [options]
 * @returns {number}
 */
export const price = (car: bookcarsTypes.Car, from: Date, to: Date, options?: bookcarsTypes.CarOptions) => {
  const _days = bookcarsHelper.days(from, to)

  let _price = car.price * _days
  if (options) {
    if (options.cancellation && car.cancellation > 0) {
      _price += car.cancellation
    }
    if (options.amendments && car.amendments > 0) {
      _price += car.amendments
    }
    if (options.theftProtection && car.theftProtection > 0) {
      _price += car.theftProtection * _days
    }
    if (options.collisionDamageWaiver && car.collisionDamageWaiver > 0) {
      _price += car.collisionDamageWaiver * _days
    }
    if (options.fullInsurance && car.fullInsurance > 0) {
      _price += car.fullInsurance * _days
    }
    if (options.additionalDriver && car.additionalDriver > 0) {
      _price += car.additionalDriver * _days
    }
  }

  return _price
}

/**
 * Get cancellation option label.
 *
 * @param {number} cancellation
 * @param {string} language
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getCancellationOption = (cancellation: number, language: string, hidePlus?: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (cancellation === -1) {
    return i18n.t('UNAVAILABLE')
  } if (cancellation === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(cancellation, i18n.t('CURRENCY'), language)}`
}

/**
 * Get amendments option label.
 *
 * @param {number} amendments
 * @param {string} language
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getAmendmentsOption = (amendments: number, language: string, hidePlus?: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (amendments === -1) {
    return `${i18n.t('UNAVAILABLE')}${fr ? 's' : ''}`
  } if (amendments === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'es' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(amendments, i18n.t('CURRENCY'), language)}`
}

/**
 * Get collision damage waiver option label.
 *
 * @param {number} collisionDamageWaiver
 * @param {number} days
 * @param {string} language
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getCollisionDamageWaiverOption = (collisionDamageWaiver: number, days: number, language: string, hidePlus?: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (collisionDamageWaiver === -1) {
    return i18n.t('UNAVAILABLE')
  } if (collisionDamageWaiver === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(collisionDamageWaiver * days, i18n.t('CURRENCY'), language)} (${bookcarsHelper.formatPrice(collisionDamageWaiver, i18n.t('CURRENCY'), language)}${i18n.t('DAILY')})`
}

/**
 * Get theft protection option label.
 *
 * @param {number} theftProtection
 * @param {number} days
 * @param {string} language
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getTheftProtectionOption = (theftProtection: number, days: number, language: string, hidePlus?: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (theftProtection === -1) {
    return i18n.t('UNAVAILABLE')
  } if (theftProtection === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(theftProtection * days, i18n.t('CURRENCY'), language)} (${bookcarsHelper.formatPrice(theftProtection, i18n.t('CURRENCY'), language)}${i18n.t('DAILY')})`
}

/**
 * Description placeholder
 *
 * @param {number} fullInsurance
 * @param {number} days
 * @param {string} language
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getFullInsuranceOption = (fullInsurance: number, days: number, language: string, hidePlus?: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (fullInsurance === -1) {
    return i18n.t('UNAVAILABLE')
  } if (fullInsurance === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(fullInsurance * days, i18n.t('CURRENCY'), language)} (${bookcarsHelper.formatPrice(fullInsurance, i18n.t('CURRENCY'), language)}${i18n.t('DAILY')})`
}

/**
 * Get addional driver option label.
 *
 * @param {number} additionalDriver
 * @param {number} days
 * @param {string} language
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getAdditionalDriverOption = (additionalDriver: number, days: number, language: string, hidePlus?: boolean) => {
  if (additionalDriver === -1) {
    return i18n.t('UNAVAILABLE')
  } if (additionalDriver === 0) {
    return i18n.t('INCLUDED')
  }
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(additionalDriver * days, i18n.t('CURRENCY'), language)} (${bookcarsHelper.formatPrice(additionalDriver, i18n.t('CURRENCY'), language)}${i18n.t('DAILY')})`
}

/**
 * Get all booking statuses.
 *
 * @returns {bookcarsTypes.StatusFilterItem[]}
 */
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

/**
 * Get booking status label.
 *
 * @param {string} status
 * @returns {string}
 */
export const getBookingStatus = (status: bookcarsTypes.BookingStatus) => {
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

/**
 * Get bithdate error message.
 *
 * @param {number} minimumAge
 * @returns {string}
 */
export const getBirthDateError = (minimumAge: number) =>
  `${i18n.t('BIRTH_DATE_NOT_VALID_PART1')} ${minimumAge} ${i18n.t('BIRTH_DATE_NOT_VALID_PART2')} `

/**
 * Navigate to screen.
 *
 * @param {RouteProp<StackParams, keyof StackParams>} route
 * @param {NativeStackNavigationProp<StackParams, keyof StackParams>} navigation
 */
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
      navigation.navigate(
        route.name,
        {
          d: new Date().getTime(),
          id: (route.params && 'id' in route.params && route.params.id as string) || '',
        }
      )
      break
    case 'Cars':
      navigation.navigate(
        route.name,
        {
          d: new Date().getTime(),
          pickupLocation: (route.params && 'pickupLocation' in route.params && route.params.pickupLocation as string) || '',
          dropOffLocation: (route.params && 'dropOffLocation' in route.params && route.params.dropOffLocation as string) || '',
          from: (route.params && 'from' in route.params && route.params.from as number) || 0,
          to: (route.params && 'to' in route.params && route.params.to as number) || 0,
        }
      )
      break
    case 'Checkout':
      navigation.navigate(
        route.name,
        {
          d: new Date().getTime(),
          car: (route.params && 'car' in route.params && route.params.car as string) || '',
          pickupLocation: (route.params && 'pickupLocation' in route.params && route.params.pickupLocation as string) || '',
          dropOffLocation: (route.params && 'dropOffLocation' in route.params && route.params.dropOffLocation as string) || '',
          from: (route.params && 'from' in route.params && route.params.from as number) || 0,
          to: (route.params && 'to' in route.params && route.params.to as number) || 0,
        }
      )
      break
    default:
      break
  }
}
