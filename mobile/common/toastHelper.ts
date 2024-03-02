import Toast from 'react-native-root-toast'
import i18n from '../lang/i18n'

/**
 * Toast a message.
 *
 * @param {string} message
 */
export const toast = (message: string) => {
    Toast.show(message, {
      duration: Toast.durations.LONG,
    })
  }

/**
 * Toast an error message.
 *
 * @param {?unknown} [err]
 * @param {boolean} [__toast__=true]
 */
export const error = (err?: unknown, __toast__ = true) => {
    if (err) {
      console.log(err)
    }
    if (__toast__) {
      toast(i18n.t('GENERIC_ERROR'))
    }
  }
