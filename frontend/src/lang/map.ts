import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

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
})

langHelper.setLanguage(strings)
export { strings }
