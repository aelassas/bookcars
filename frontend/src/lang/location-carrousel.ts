import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SELECT_LOCATION: 'Choisir ce lieu',
    AVALIABLE_LOCATION: 'lieu disponible',
    AVALIABLE_LOCATIONS: 'lieux disponibles',
  },
  en: {
    SELECT_LOCATION: 'Select Location',
    AVALIABLE_LOCATION: 'available location',
    AVALIABLE_LOCATIONS: 'available locations',
  },
  es: {
    SELECT_LOCATION: 'Seleccionar ubicación',
    AVALIABLE_LOCATION: 'ubicación disponible',
    AVALIABLE_LOCATIONS: 'ubicaciones disponibles',
  },
  ja: {
    SELECT_LOCATION: '場所を選択',
    AVALIABLE_LOCATION: '利用可能な場所',
    AVALIABLE_LOCATIONS: '利用可能な場所',
  },
})

langHelper.setLanguage(strings)
export { strings }
