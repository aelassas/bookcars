import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    CAR_RANGE_MINI: 'Mini',
    CAR_RANGE_MIDI: 'Midi',
    CAR_RANGE_MAXI: 'Maxi',
  },
  en: {
    CAR_RANGE_MINI: 'Mini',
    CAR_RANGE_MIDI: 'Midi',
    CAR_RANGE_MAXI: 'Maxi',
  },
  es: {
    CAR_RANGE_MINI: 'Mini',
    CAR_RANGE_MIDI: 'Midi',
    CAR_RANGE_MAXI: 'Maxi',
  },
})

langHelper.setLanguage(strings)
export { strings }
