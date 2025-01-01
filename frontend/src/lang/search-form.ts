import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    PICK_UP_DATE: 'Date de prise en charge',
    DROP_OFF_DATE: 'Date de retour',
    DROP_OFF: 'Restituer au même endroit',
  },
  en: {
    PICK_UP_DATE: 'Pick-up Date',
    DROP_OFF_DATE: 'Drop-off Date',
    DROP_OFF: 'Return to same location',
  },
  es: {
    PICK_UP_DATE: 'Fecha de recogida',
    DROP_OFF_DATE: 'Fecha de entrega',
    DROP_OFF: 'Devolución al mismo lugar',
  },
})

langHelper.setLanguage(strings)
export { strings }
