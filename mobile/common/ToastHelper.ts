import Toast from 'react-native-root-toast'
import i18n from '../lang/i18n'

export const toast = (message: string) => {
    Toast.show(message, {
      duration: Toast.durations.LONG,
    })
  }
  
export const error = (err?: unknown, __toast__ = true) => {
    if (err) {
      console.log(err)
    }
    if (__toast__) {
      toast(i18n.t('GENERIC_ERROR'))
    }
  }
