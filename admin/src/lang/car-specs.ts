import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    CAR_SPECS: 'Spécificités du véhicule',
    AIRCON: 'Climatisation',
    MORE_THAN_FOOR_DOORS: '4+ portes',
    MORE_THAN_FIVE_SEATS: '5+ sièges',
  },
  en: {
    CAR_SPECS: 'Car specs',
    AIRCON: 'Air Conditioning',
    MORE_THAN_FOOR_DOORS: '4+ doors',
    MORE_THAN_FIVE_SEATS: '5+ seats',
  },
  es: {
    CAR_SPECS: 'Especificaciones del coche',
    AIRCON: 'Aire acondicionado',
    MORE_THAN_FOOR_DOORS: '4+ puertas',
    MORE_THAN_FIVE_SEATS: '5+ asientos',
  },
})

langHelper.setLanguage(strings)
export { strings }
