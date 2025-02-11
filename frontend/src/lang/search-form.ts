import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'
import env from '@/config/env.config'

const strings = new LocalizedStrings({
  fr: {
    PICK_UP_DATE: 'Date de prise en charge',
    DROP_OFF_DATE: 'Date de retour',
    DROP_OFF: 'Restituer au même endroit',
    MIN_PICK_UP_HOURS_ERROR: `L'heure de prise en charge de la voiture doit être au moins ${env.MIN_PICK_UP_HOURS} heure${env.MIN_PICK_UP_HOURS > 1 ? 's' : ''} plus tard`,
    MIN_RENTAL_HOURS_ERROR: `Il doit y avoir au moins ${env.MIN_RENTAL_HOURS} heure${env.MIN_RENTAL_HOURS > 1 ? 's' : ''} entre la prise en charge et la restitution de la voiture`,
  },
  en: {
    PICK_UP_DATE: 'Pick-up Date',
    DROP_OFF_DATE: 'Drop-off Date',
    DROP_OFF: 'Return to same location',
    MIN_PICK_UP_HOURS_ERROR: `Pick up time must be at least ${env.MIN_PICK_UP_HOURS} hour${env.MIN_PICK_UP_HOURS > 1 ? 's' : ''} in the future`,
    MIN_RENTAL_HOURS_ERROR: `There must be at least ${env.MIN_RENTAL_HOURS} hour${env.MIN_RENTAL_HOURS > 1 ? 's' : ''} between pick up and drop off`,
  },
  es: {
    PICK_UP_DATE: 'Fecha de recogida',
    DROP_OFF_DATE: 'Fecha de entrega',
    DROP_OFF: 'Devolución al mismo lugar',
    MIN_PICK_UP_HOURS_ERROR: `La hora de recogida del vehículo debe ser al menos ${env.MIN_PICK_UP_HOURS} hora${env.MIN_PICK_UP_HOURS > 1 ? 's' : ''} en el futuro`,
    MIN_RENTAL_HOURS_ERROR: `Debe haber al menos ${env.MIN_RENTAL_HOURS} hora${env.MIN_RENTAL_HOURS > 1 ? 's' : ''} entre la recogida y la devolución del vehículo`,
  },
})

langHelper.setLanguage(strings)
export { strings }
