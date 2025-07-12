import Toast from 'react-native-toast-message'
import i18n from '@/lang/i18n'

/**
 * Toast a message.
 *
 * @param {string} message
 */
export const toast = (message: string) => {
  Toast.show({
    type: 'info',
    text1: message,
    visibilityTime: 3000,
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
    Toast.show({
      type: 'error',
      text1: i18n.t('GENERIC_ERROR'),
      visibilityTime: 3000,
    })
  }
}
