import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_PARKING_SPOT: 'Nouvelle place de parking',
  },
  en: {
    NEW_PARKING_SPOT: 'New parking spot',
  },
  es: {
    NEW_PARKING_SPOT: 'Nueva plaza de aparcamiento',
  },
  de: {
    NEW_PARKING_SPOT: 'Neuer Parkplatz',
  },
  pt: {
    NEW_PARKING_SPOT: 'Novo lugar de estacionamento',
  },
})

langHelper.setLanguage(strings)
export { strings }
