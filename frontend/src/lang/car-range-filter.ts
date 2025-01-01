import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    RANGE: 'Gamme',
    MINI: 'Mini',
    MIDI: 'Midi',
    MAXI: 'Maxi',
    SCOOTER: 'Scooter',
  },
  en: {
    RANGE: 'Range',
    MINI: 'Mini',
    MIDI: 'Midi',
    MAXI: 'Maxi',
    SCOOTER: 'Scooter',
  },
  es: {
    RANGE: 'Gama',
    MINI: 'Mini',
    MIDI: 'Midi',
    MAXI: 'Maxi',
    SCOOTER: 'Scooter',
  },
})

langHelper.setLanguage(strings)
export { strings }
