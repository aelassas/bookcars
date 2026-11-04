import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

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
  de: {
    RANGE: 'Fahrzeugklasse',
    MINI: 'Mini',
    MIDI: 'Midi',
    MAXI: 'Maxi',
    SCOOTER: 'Scooter',
  },
  pt: {
    RANGE: 'Gama',
    MINI: 'Mini',
    MIDI: 'Midi',
    MAXI: 'Maxi',
    SCOOTER: 'Scooter',
  },
  it: {
    RANGE: 'Categoria',
    MINI: 'Mini',
    MIDI: 'Midi',
    MAXI: 'Maxi',
    SCOOTER: 'Scooter',
  },
  zh: {
    RANGE: '车型等级',
    MINI: '迷你型',
    MIDI: '中型',
    MAXI: '大型',
    SCOOTER: '踏板车',
  },
  ja: {
    RANGE: 'クラス',
    MINI: 'ミニ',
    MIDI: 'ミディ',
    MAXI: 'マキシ',
    SCOOTER: 'スクーター',
  },
})

langHelper.setLanguage(strings)
export { strings }
