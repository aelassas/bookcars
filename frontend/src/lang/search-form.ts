import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    PICK_UP_DATE: 'Date de prise en charge',
    DROP_OFF_DATE: 'Date de retour',
    DROP_OFF: 'Restituer au même endroit',
    MIN_PICK_UP_HOURS_ERROR: "L'heure de retrait doit être prévue quelques heures à l'avance",
    MIN_RENTAL_HOURS_ERROR: 'La durée de location est trop courte',
    INVALID_PICK_UP_TIME: 'Heure de prise en charge invalide',
    INVALID_DROP_OFF_TIME: 'Heure de restitution invalide',
  },
  en: {
    PICK_UP_DATE: 'Pick-up Date',
    DROP_OFF_DATE: 'Drop-off Date',
    DROP_OFF: 'Return to same location',
    MIN_PICK_UP_HOURS_ERROR: 'Pick-up time must be at least a few hours in the future',
    MIN_RENTAL_HOURS_ERROR: 'Rental duration is too short',
    INVALID_PICK_UP_TIME: 'Invalid pick-up time',
    INVALID_DROP_OFF_TIME: 'Invalid drop-off time',
  },
  es: {
    PICK_UP_DATE: 'Fecha de recogida',
    DROP_OFF_DATE: 'Fecha de entrega',
    DROP_OFF: 'Devolución al mismo lugar',
    MIN_PICK_UP_HOURS_ERROR: 'La hora de recogida debe programarse con varias horas de anticipación',
    MIN_RENTAL_HOURS_ERROR: 'La duración del alquiler es demasiado corta',
    INVALID_PICK_UP_TIME: 'Hora de recogida no válida',
    INVALID_DROP_OFF_TIME: 'Hora de devolución no válida',
  },
  de: {
    PICK_UP_DATE: 'Abholdatum',
    DROP_OFF_DATE: 'Rückgabedatum',
    DROP_OFF: 'Rückgabe am selben Ort',
    MIN_PICK_UP_HOURS_ERROR: 'Die Abholzeit muss mindestens einige Stunden in der Zukunft liegen',
    MIN_RENTAL_HOURS_ERROR: 'Die Mietdauer ist zu kurz',
    INVALID_PICK_UP_TIME: 'Ungültige Abholzeit',
    INVALID_DROP_OFF_TIME: 'Ungültige Rückgabezeit',
  },
  pt: {
    PICK_UP_DATE: 'Data de levantamento',
    DROP_OFF_DATE: 'Data de devolução',
    DROP_OFF: 'Devolver no mesmo local',
    MIN_PICK_UP_HOURS_ERROR: 'A hora de levantamento deve ser, pelo menos, daqui a algumas horas',
    MIN_RENTAL_HOURS_ERROR: 'A duração do aluguer é demasiado curta',
    INVALID_PICK_UP_TIME: 'Hora de levantamento inválida',
    INVALID_DROP_OFF_TIME: 'Hora de devolução inválida',
  },
})

langHelper.setLanguage(strings)
export { strings }
