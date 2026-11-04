import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    PICK_UP_LOCATION: 'Lieu de prise en charge',
    DROP_OFF_LOCATION: 'Lieu de restitution',
  },
  en: {
    PICK_UP_LOCATION: 'Pick-up location',
    DROP_OFF_LOCATION: 'Drop-off location',
  },
  es: {
    PICK_UP_LOCATION: 'Lugar de recogida',
    DROP_OFF_LOCATION: 'Lugar de entrega',
  },
  de: {
    PICK_UP_LOCATION: 'Abholort',
    DROP_OFF_LOCATION: 'Rückgabeort',
  },
  pt: {
    PICK_UP_LOCATION: 'Local de levantamento',
    DROP_OFF_LOCATION: 'Local de devolução',
  },
})

langHelper.setLanguage(strings)
export { strings }
