import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CommonActions, DrawerActions, NavigationRoute, RouteProp } from '@react-navigation/native'
import mime from 'mime'

import i18n from '@/lang/i18n'
import * as UserService from '@/services/UserService'
import * as StripeService from '@/services/StripeService'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import * as toastHelper from '@/common/toastHelper'
import * as env from '@/config/env.config'

/**
 * Indicate whether Platform OS is Android or not.
 *
 * @returns {boolean}
 */
export const android = () => Platform.OS === 'android'

/**
 * Indicate whether Platform OS is iOS or not.
 *
 * @returns {boolean}
 */
export const ios = () => Platform.OS === 'ios'

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
        const settings = await Notifications.getPermissionsAsync()
        let granted = ('granted' in settings && settings.granted) || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED

        if (!granted) {
          const status = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
            android: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            }
          })
          granted = ('granted' in status && status.granted) || status.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
        }
        if (!granted) {
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
    case bookcarsTypes.FuelPolicy.LikeForLike:
      return i18n.t('FUEL_POLICY_LIKE_FOR_LIKE')

    case bookcarsTypes.FuelPolicy.FreeTank:
      return i18n.t('FUEL_POLICY_FREE_TANK')

    case bookcarsTypes.FuelPolicy.FullToFull:
      return i18n.t('FUEL_POLICY_FULL_TO_FULL')

    case bookcarsTypes.FuelPolicy.FullToEmpty:
      return i18n.t('FUEL_POLICY_FULL_TO_EMPTY')

    default:
      return ''
  }
}

/**
 * Get cancellation label.
 *
 * @param {number} cancellation
 * @param {string} language
 * @param {number} priceChangeRate
 * @returns {string}
 */
export const getCancellation = async (cancellation: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (cancellation === -1) {
    return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } if (cancellation === 0) {
    return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  let _cancellation = await StripeService.convertPrice(cancellation)
  _cancellation += _cancellation * (priceChangeRate / 100)
  return `${i18n.t('CANCELLATION')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_cancellation, (await StripeService.getCurrencySymbol()), language)}`
}

/**
 * Get amendments label.
 *
 * @param {number} amendments
 * @param {string} language
 * @param {number} priceChangeRate
 * @returns {string}
 */
export const getAmendments = async (amendments: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (amendments === -1) {
    return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}${fr ? 's' : ''}`
  } if (amendments === 0) {
    return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'es' : ''}`
  }
  let _amendments = await StripeService.convertPrice(amendments)
  _amendments += _amendments * (priceChangeRate / 100)
  return `${i18n.t('AMENDMENTS')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_amendments, (await StripeService.getCurrencySymbol()), language)}`
}

/**
 * Get theft protection label.
 *
 * @param {number} theftProtection
 * @param {string} language
 * @param {number} priceChangeRate
 * @returns {string}
 */
export const getTheftProtection = async (theftProtection: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (theftProtection === -1) {
    return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } if (theftProtection === 0) {
    return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  let _theftProtection = await StripeService.convertPrice(theftProtection)
  _theftProtection += _theftProtection * (priceChangeRate / 100)
  return `${i18n.t('THEFT_PROTECTION')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_theftProtection, (await StripeService.getCurrencySymbol()), language)}${i18n.t('DAILY')}`
}

/**
 * Get collision damage waiver label.
 *
 * @param {number} collisionDamageWaiver
 * @param {string} language
 * @param {number} priceChangeRate
 * @returns {string}
 */
export const getCollisionDamageWaiver = async (collisionDamageWaiver: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (collisionDamageWaiver === -1) {
    return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } if (collisionDamageWaiver === 0) {
    return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  let _collisionDamageWaiver = await StripeService.convertPrice(collisionDamageWaiver)
  _collisionDamageWaiver += _collisionDamageWaiver * (priceChangeRate / 100)
  return `${i18n.t('COLLISION_DAMAGE_WAVER')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_collisionDamageWaiver, (await StripeService.getCurrencySymbol()), language)}${i18n.t('DAILY')}`
}

/**
 * Get full insurance label.
 *
 * @param {number} fullInsurance
 * @param {string} language
 * @param {number} priceChangeRate
 * @returns {string}
 */
export const getFullInsurance = async (fullInsurance: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (fullInsurance === -1) {
    return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } if (fullInsurance === 0) {
    return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  let _fullInsurance = await StripeService.convertPrice(fullInsurance)
  _fullInsurance += _fullInsurance * (priceChangeRate / 100)
  return `${i18n.t('FULL_INSURANCE')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_fullInsurance, (await StripeService.getCurrencySymbol()), language)}${i18n.t('DAILY')}`
}

/**
 * Get addtional driver label.
 *
 * @param {number} additionalDriver
 * @param {string} language
 * @param {number} priceChangeRate
 * @returns {string}
 */
export const getAdditionalDriver = async (additionalDriver: number, language: string, priceChangeRate: number) => {
  const fr = bookcarsHelper.isFrench(language)

  if (additionalDriver === -1) {
    return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${i18n.t('UNAVAILABLE')}`
  } if (additionalDriver === 0) {
    return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${i18n.t('INCLUDED')}`
  }
  let _additionalDriver = await StripeService.convertPrice(additionalDriver)
  _additionalDriver += _additionalDriver * (priceChangeRate / 100)
  return `${i18n.t('ADDITIONAL_DRIVER')}${fr ? ' : ' : ': '}${bookcarsHelper.formatPrice(_additionalDriver, (await StripeService.getCurrencySymbol()), language)}${i18n.t('DAILY')}`
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
 * Get cancellation option label.
 *
 * @param {number} cancellation
 * @param {string} language
 * @param {number} priceChangeRate
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getCancellationOption = async (cancellation: number, language: string, priceChangeRate: number, hidePlus?: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (cancellation === -1) {
    return i18n.t('UNAVAILABLE')
  } if (cancellation === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  let _cancellation = await StripeService.convertPrice(cancellation)
  _cancellation += _cancellation * (priceChangeRate / 100)
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(_cancellation, (await StripeService.getCurrencySymbol()), language)}`
}

/**
 * Get amendments option label.
 *
 * @param {number} amendments
 * @param {string} language
 * @param {number} priceChangeRate
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getAmendmentsOption = async (amendments: number, language: string, priceChangeRate: number, hidePlus?: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (amendments === -1) {
    return `${i18n.t('UNAVAILABLE')}${fr ? 's' : ''}`
  } if (amendments === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'es' : ''}`
  }
  let _amendments = await StripeService.convertPrice(amendments)
  _amendments += _amendments * (priceChangeRate / 100)
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(_amendments, (await StripeService.getCurrencySymbol()), language)}`
}

/**
 * Get collision damage waiver option label.
 *
 * @param {number} collisionDamageWaiver
 * @param {number} days
 * @param {string} language
 * @param {number} priceChangeRate
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getCollisionDamageWaiverOption = async (collisionDamageWaiver: number, days: number, language: string, priceChangeRate: number, hidePlus?: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (collisionDamageWaiver === -1) {
    return i18n.t('UNAVAILABLE')
  } if (collisionDamageWaiver === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  let _collisionDamageWaiver = await StripeService.convertPrice(collisionDamageWaiver)
  _collisionDamageWaiver += _collisionDamageWaiver * (priceChangeRate / 100)
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(_collisionDamageWaiver * days, (await StripeService.getCurrencySymbol()), language)} (${bookcarsHelper.formatPrice(_collisionDamageWaiver, (await StripeService.getCurrencySymbol()), language)}${i18n.t('DAILY')})`
}

/**
 * Get theft protection option label.
 *
 * @param {number} theftProtection
 * @param {number} days
 * @param {string} language
 * @param {number} priceChangeRate
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getTheftProtectionOption = async (theftProtection: number, days: number, language: string, priceChangeRate: number, hidePlus?: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (theftProtection === -1) {
    return i18n.t('UNAVAILABLE')
  } if (theftProtection === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  let _theftProtection = await StripeService.convertPrice(theftProtection)
  _theftProtection += _theftProtection * (priceChangeRate / 100)
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(_theftProtection * days, (await StripeService.getCurrencySymbol()), language)} (${bookcarsHelper.formatPrice(_theftProtection, (await StripeService.getCurrencySymbol()), language)}${i18n.t('DAILY')})`
}

/**
 * Description placeholder
 *
 * @param {number} fullInsurance
 * @param {number} days
 * @param {string} language
 * @param {number} priceChangeRate
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getFullInsuranceOption = async (fullInsurance: number, days: number, language: string, priceChangeRate: number, hidePlus?: boolean) => {
  const fr = bookcarsHelper.isFrench(language)

  if (fullInsurance === -1) {
    return i18n.t('UNAVAILABLE')
  } if (fullInsurance === 0) {
    return `${i18n.t('INCLUDED')}${fr ? 'e' : ''}`
  }
  let _fullInsurance = await StripeService.convertPrice(fullInsurance)
  _fullInsurance += _fullInsurance * (priceChangeRate / 100)
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(_fullInsurance * days, (await StripeService.getCurrencySymbol()), language)} (${bookcarsHelper.formatPrice(_fullInsurance, (await StripeService.getCurrencySymbol()), language)}${i18n.t('DAILY')})`
}

/**
 * Get addional driver option label.
 *
 * @param {number} additionalDriver
 * @param {number} days
 * @param {string} language
 * @param {number} priceChangeRate
 * @param {?boolean} [hidePlus]
 * @returns {string}
 */
export const getAdditionalDriverOption = async (additionalDriver: number, days: number, language: string, priceChangeRate: number, hidePlus?: boolean) => {
  if (additionalDriver === -1) {
    return i18n.t('UNAVAILABLE')
  } if (additionalDriver === 0) {
    return i18n.t('INCLUDED')
  }
  let _additionalDriver = await StripeService.convertPrice(additionalDriver)
  _additionalDriver += _additionalDriver * (priceChangeRate / 100)
  return `${hidePlus ? '' : '+ '}${bookcarsHelper.formatPrice(_additionalDriver * days, (await StripeService.getCurrencySymbol()), language)} (${bookcarsHelper.formatPrice(_additionalDriver, (await StripeService.getCurrencySymbol()), language)}${i18n.t('DAILY')})`
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
  navigation: NativeStackNavigationProp<StackParams, keyof StackParams>,
  reload?: boolean,
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
    case 'ToS': {
      const params = { d: Date.now() }
      if (reload) {
        navigation.dispatch((state) => {
          const { routes } = state
          const index = routes.findIndex((r) => r.name === route.name)
          const _routes = bookcarsHelper.cloneArray(routes) as NavigationRoute<StackParams, keyof StackParams>[]
          // _routes.splice(index, 1)
          const now = Date.now()
          _routes[index] = {
            name: route.name,
            key: `${route.name}-${now}`,
            params,
          }
          // _routes.push({
          //   name: route.name,
          //   key: `${route.name}-${now}`,
          //   params,
          // })

          return CommonActions.reset({
            ...state,
            routes: _routes,
            // index: routes.length - 1,
            index,
          })
        })
        navigation.dispatch(DrawerActions.closeDrawer())
      } else {
        navigation.navigate(route.name, params)
      }
      break
    }
    case 'Booking': {
      const params = {
        d: Date.now(),
        id: (route.params && 'id' in route.params && route.params.id as string) || '',
      }
      if (reload) {
        navigation.dispatch((state) => {
          const { routes } = state
          const index = routes.findIndex((r) => r.name === 'Booking')
          const _routes = bookcarsHelper.cloneArray(routes) as NavigationRoute<StackParams, keyof StackParams>[]
          // _routes.splice(index, 1)
          // const now = Date.now()
          // _routes.push({
          //   name: 'Booking',
          //   key: `Booking-${now}`,
          //   params,
          // })
          const now = Date.now()
          _routes[index] = {
            name: route.name,
            key: `${route.name}-${now}`,
            params,
          }

          return CommonActions.reset({
            ...state,
            routes: _routes,
            // index: routes.length - 1,
            index,
          })
        })
        navigation.dispatch(DrawerActions.closeDrawer())
      } else {
        navigation.navigate(
          route.name,
          params
        )
      }
      break
    }
    case 'Cars': {
      const params = {
        d: Date.now(),
        pickupLocation: (route.params && 'pickupLocation' in route.params && route.params.pickupLocation as string) || '',
        dropOffLocation: (route.params && 'dropOffLocation' in route.params && route.params.dropOffLocation as string) || '',
        from: (route.params && 'from' in route.params && route.params.from as number) || 0,
        to: (route.params && 'to' in route.params && route.params.to as number) || 0,
      }
      if (reload) {
        navigation.dispatch((state) => {
          const { routes } = state
          const index = routes.findIndex((r) => r.name === 'Cars')
          const _routes = bookcarsHelper.cloneArray(routes) as NavigationRoute<StackParams, keyof StackParams>[]
          // _routes.splice(index, 1)
          // const now = Date.now()
          // _routes.push({
          //   name: 'Cars',
          //   key: `Cars-${now}`,
          //   params,
          // })
          const now = Date.now()
          _routes[index] = {
            name: route.name,
            key: `${route.name}-${now}`,
            params,
          }

          return CommonActions.reset({
            ...state,
            routes: _routes,
            // index: routes.length - 1,
            index,
          })
        })
        navigation.dispatch(DrawerActions.closeDrawer())
      } else {
        navigation.navigate(route.name, params)
      }
      break
    }
    case 'Checkout': {
      const params = {
        d: Date.now(),
        car: (route.params && 'car' in route.params && route.params.car as string) || '',
        pickupLocation: (route.params && 'pickupLocation' in route.params && route.params.pickupLocation as string) || '',
        dropOffLocation: (route.params && 'dropOffLocation' in route.params && route.params.dropOffLocation as string) || '',
        from: (route.params && 'from' in route.params && route.params.from as number) || 0,
        to: (route.params && 'to' in route.params && route.params.to as number) || 0,
      }
      if (reload) {
        navigation.dispatch((state) => {
          const { routes } = state
          const index = routes.findIndex((r) => r.name === 'Checkout')
          const _routes = bookcarsHelper.cloneArray(routes) as NavigationRoute<StackParams, keyof StackParams>[]
          // _routes.splice(index, 1)
          // const now = Date.now()
          // _routes.push({
          //   name: 'Checkout',
          //   key: `Checkout-${now}`,
          //   params,
          // })
          const now = Date.now()
          _routes[index] = {
            name: route.name,
            key: `${route.name}-${now}`,
            params,
          }

          return CommonActions.reset({
            ...state,
            routes: _routes,
            // index: routes.length - 1,
            index,
          })
        })
        navigation.dispatch(DrawerActions.closeDrawer())
      } else {
        navigation.navigate(
          route.name,
          params
        )
      }
      break
    }
    default:
      break
  }
}

type DepositFilterValue = 'value1' | 'value2' | 'value3'

export const getDepositFilterValue = async (language: string, value: DepositFilterValue): Promise<string> => {
  const currency = await StripeService.getCurrencySymbol()
  const isCurrencyRTL = await StripeService.currencyRTL()

  let depositFilterValue = 0

  if (value === 'value1') {
    depositFilterValue = await StripeService.convertPrice(env.DEPOSIT_FILTER_VALUE_1)
  } else if (value === 'value2') {
    depositFilterValue = await StripeService.convertPrice(env.DEPOSIT_FILTER_VALUE_2)
  } else if (value === 'value3') {
    depositFilterValue = await StripeService.convertPrice(env.DEPOSIT_FILTER_VALUE_3)
  }

  switch (language) {
    case 'fr':
      return `Moins de ${isCurrencyRTL ? currency : ''}${depositFilterValue}${!isCurrencyRTL ? (` ${currency}`) : ''}`
    case 'es':
      return `Menos de ${isCurrencyRTL ? currency : ''}${depositFilterValue}${!isCurrencyRTL ? (` ${currency}`) : ''}`
    case 'en':
    default:
      return `Less than ${isCurrencyRTL ? currency : ''}${depositFilterValue}${!isCurrencyRTL ? (` ${currency}`) : ''}`
  }
}

/**
 * Get fuel policy label.
 *
 * @param {string} range
 * @returns {string}
 */
export const getCarRange = (range: bookcarsTypes.CarRange) => {
  switch (range) {
    case bookcarsTypes.CarRange.Mini:
      return i18n.t('CAR_RANGE_MINI')

    case bookcarsTypes.CarRange.Midi:
      return i18n.t('CAR_RANGE_MIDI')

    case bookcarsTypes.CarRange.Maxi:
      return i18n.t('CAR_RANGE_MAXI')

    case bookcarsTypes.CarRange.Scooter:
      return i18n.t('CAR_RANGE_SCOOTER')

    case bookcarsTypes.CarRange.Bus:
      return i18n.t('CAR_RANGE_BUS')

    case bookcarsTypes.CarRange.Truck:
      return i18n.t('CAR_RANGE_TRUCK')

    case bookcarsTypes.CarRange.Caravan:
      return i18n.t('CAR_RANGE_CARAVAN')

    default:
      return ''
  }
}
