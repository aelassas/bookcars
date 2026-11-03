import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    TOTAL: 'Total :',
    DELETE_BOOKING: 'Êtes-vous sûr de vouloir supprimer cette réservation ?',
  },
  en: {
    TOTAL: 'Total:',
    DELETE_BOOKING: 'Are you sure you want to delete this booking?',
  },
  es: {
    TOTAL: 'Total:',
    DELETE_BOOKING: '¿Estás seguro de que quieres eliminar esta reserva?',
  },
  de: {
    TOTAL: 'Gesamt:',
    DELETE_BOOKING: 'Sind Sie sicher, dass Sie diese Buchung löschen möchten?',
  },
})

langHelper.setLanguage(strings)
export { strings }
