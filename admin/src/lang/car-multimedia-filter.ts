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
})

langHelper.setLanguage(strings)
export { strings }
