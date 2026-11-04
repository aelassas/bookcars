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
  de: {
    CAR_SPECS: 'Fahrzeugdaten',
    AIRCON: 'Klimaanlage',
    MORE_THAN_FOOR_DOORS: '4+ Türen',
    MORE_THAN_FIVE_SEATS: '5+ Sitze',
  },
  pt: {
    CAR_SPECS: 'Especificações do veículo',
    AIRCON: 'Ar condicionado',
    MORE_THAN_FOOR_DOORS: '4+ portas',
    MORE_THAN_FIVE_SEATS: '5+ lugares',
  },
  it: {
    CAR_SPECS: 'Specifiche del veicolo',
    AIRCON: 'Aria condizionata',
    MORE_THAN_FOOR_DOORS: '4+ porte',
    MORE_THAN_FIVE_SEATS: '5+ posti',
  },
  zh: {
    CAR_SPECS: '车辆规格',
    AIRCON: '空调',
    MORE_THAN_FOOR_DOORS: '4 门以上',
    MORE_THAN_FIVE_SEATS: '5 座以上',
  },
  ja: {
    CAR_SPECS: '車両スペック',
    AIRCON: 'エアコン',
    MORE_THAN_FOOR_DOORS: '4ドア以上',
    MORE_THAN_FIVE_SEATS: '5人乗り以上',
  },
})

langHelper.setLanguage(strings)
export { strings }
