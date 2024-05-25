import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_BOOKING: 'Nouvelle réservation',
  },
  en: {
    NEW_BOOKING: 'New Booking',
  },
  el: {
    NEW_BOOKING: 'Νέα κράτηση',
  },
})

langHelper.setLanguage(strings)
export { strings }
