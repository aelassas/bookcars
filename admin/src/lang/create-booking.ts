import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_BOOKING_HEADING: 'Nouvelle réservation',
  },
  en: {
    NEW_BOOKING_HEADING: 'New booking',
  },
  es: {
    NEW_BOOKING_HEADING: 'Nueva reserva',
  },
  de: {
    NEW_BOOKING_HEADING: 'Neue Buchung',
  },
  pt: {
    NEW_BOOKING_HEADING: 'Nova reserva',
  },
  it: {
    NEW_BOOKING_HEADING: 'Nuova prenotazione',
  },
  zh: {
    NEW_BOOKING_HEADING: '新建预订',
  },
  ja: {
    NEW_BOOKING_HEADING: '新規予約',
  },
})

langHelper.setLanguage(strings)
export { strings }
