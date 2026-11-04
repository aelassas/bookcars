import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    MULTIMEDIA: 'Multimédia',
    TOUCHSCREEN: 'Écran tactile',
    BLUETOOTH: 'Bluetooth',
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
  },
  en: {
    MULTIMEDIA: 'Multimedia',
    TOUCHSCREEN: 'Touchscreen',
    BLUETOOTH: 'Bluetooth',
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
  },
  es: {
    MULTIMEDIA: 'Multimedia',
    TOUCHSCREEN: 'Pantalla táctil',
    BLUETOOTH: 'Bluetooth',
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
  },
  de: {
    MULTIMEDIA: 'Multimedia',
    TOUCHSCREEN: 'Touchscreen',
    BLUETOOTH: 'Bluetooth',
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
  },
  pt: {
    MULTIMEDIA: 'Multimédia',
    TOUCHSCREEN: 'Ecrã tátil',
    BLUETOOTH: 'Bluetooth',
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
  },
  it: {
    MULTIMEDIA: 'Multimedia',
    TOUCHSCREEN: 'Touchscreen',
    BLUETOOTH: 'Bluetooth',
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
  },
  zh: {
    MULTIMEDIA: '多媒体',
    TOUCHSCREEN: '触摸屏',
    BLUETOOTH: 'Bluetooth',
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
  },
  ja: {
    MULTIMEDIA: 'マルチメディア',
    TOUCHSCREEN: 'タッチスクリーン',
    BLUETOOTH: 'Bluetooth',
    ANDROID_AUTO: 'Android Auto',
    APPLE_CAR_PLAY: 'Apple Car Play',
  },
})

langHelper.setLanguage(strings)
export { strings }
