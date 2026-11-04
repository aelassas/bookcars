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
  de: {
    SELECT_LOCATION: 'Standort auswählen',
    AVALIABLE_LOCATION: 'verfügbarer Standort',
    AVALIABLE_LOCATIONS: 'verfügbare Standorte',
  },
  pt: {
    SELECT_LOCATION: 'Selecionar local',
    AVALIABLE_LOCATION: 'local disponível',
    AVALIABLE_LOCATIONS: 'locais disponíveis',
  },
  it: {
    SELECT_LOCATION: 'Seleziona sede',
    AVALIABLE_LOCATION: 'sede disponibile',
    AVALIABLE_LOCATIONS: 'sedi disponibili',
  },
  zh: {
    SELECT_LOCATION: '选择地点',
    AVALIABLE_LOCATION: '个可用地点',
    AVALIABLE_LOCATIONS: '个可用地点',
  },
  ja: {
    SELECT_LOCATION: '場所を選択',
    AVALIABLE_LOCATION: '件の利用可能な場所',
    AVALIABLE_LOCATIONS: '件の利用可能な場所',
  },
})

langHelper.setLanguage(strings)
export { strings }
