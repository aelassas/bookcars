import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
    BLUETOOTH: 'Bluetooth',
    TOUCHSCREEN: 'Écran tactile',
  },
  en: {
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
    BLUETOOTH: 'Bluetooth',
    TOUCHSCREEN: 'Touchscreen',
  },
  es: {
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
    BLUETOOTH: 'Bluetooth',
    TOUCHSCREEN: 'Pantalla táctil',
  },
  de: {
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple CarPlay',
    BLUETOOTH: 'Bluetooth',
    TOUCHSCREEN: 'Touchscreen',
  },
  pt: {
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
    BLUETOOTH: 'Bluetooth',
    TOUCHSCREEN: 'Ecrã tátil',
  },
  it: {
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
    BLUETOOTH: 'Bluetooth',
    TOUCHSCREEN: 'Touchscreen',
  },
  zh: {
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
    BLUETOOTH: '蓝牙',
    TOUCHSCREEN: '触摸屏',
  },
  ja: {
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
    BLUETOOTH: 'Bluetooth',
    TOUCHSCREEN: 'タッチスクリーン',
  },
})

langHelper.setLanguage(strings)
export { strings }
