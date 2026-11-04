import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SELECT_PICK_UP_LOCATION: 'Choisir ce lieu',
    SELECT_DROP_OFF_LOCATION: 'Choisir comme lieu de restitution',
  },
  en: {
    SELECT_PICK_UP_LOCATION: 'Select Location',
    SELECT_DROP_OFF_LOCATION: 'Set as Drop-off Location',
  },
  es: {
    SELECT_PICK_UP_LOCATION: 'Seleccionar ubicación',
    SELECT_DROP_OFF_LOCATION: 'Establecer como ubicación de entrega',
  },
  de: {
    SELECT_PICK_UP_LOCATION: 'Standort auswählen',
    SELECT_DROP_OFF_LOCATION: 'Als Rückgabeort festlegen',
  },
  pt: {
    SELECT_PICK_UP_LOCATION: 'Selecionar local',
    SELECT_DROP_OFF_LOCATION: 'Definir como local de devolução',
  },
  it: {
    SELECT_PICK_UP_LOCATION: 'Seleziona sede',
    SELECT_DROP_OFF_LOCATION: 'Imposta come sede di riconsegna',
  },
  zh: {
    SELECT_PICK_UP_LOCATION: '选择地点',
    SELECT_DROP_OFF_LOCATION: '设为还车地点',
  },
  ja: {
    SELECT_PICK_UP_LOCATION: '場所を選択',
    SELECT_DROP_OFF_LOCATION: '返却場所として設定',
  },
})

langHelper.setLanguage(strings)
export { strings }
