import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_BOOKING: 'Nouvelle réservation',
  },
  en: {
    NEW_BOOKING: 'New Booking',
  },
  es: {
    NEW_BOOKING: 'Nueva reserva',
  },
  ja: {
    NEW_BOOKING: '新しい予約',
  },
})

langHelper.setLanguage(strings)
export { strings }
