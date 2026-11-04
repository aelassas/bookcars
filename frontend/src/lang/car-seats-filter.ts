import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SEATS: 'Sièges',
    TWO: '2 sièges',
    FOUR: '4 sièges',
    FIVE: '5 sièges',
    FIVE_PLUS: '5+ sièges',
  },
  en: {
    SEATS: 'Seats',
    TWO: '2 seats',
    FOUR: '4 seats',
    FIVE: '5 seats',
    FIVE_PLUS: '5+ seats',
  },
  es: {
    SEATS: 'Asientos',
    TWO: '2 asientos',
    FOUR: '4 asientos',
    FIVE: '5 asientos',
    FIVE_PLUS: '5+ asientos',
  },
  de: {
    SEATS: 'Sitze',
    TWO: '2 Sitze',
    FOUR: '4 Sitze',
    FIVE: '5 Sitze',
    FIVE_PLUS: '5+ Sitze',
  },
  pt: {
    SEATS: 'Lugares',
    TWO: '2 lugares',
    FOUR: '4 lugares',
    FIVE: '5 lugares',
    FIVE_PLUS: '5+ lugares',
  },
})

langHelper.setLanguage(strings)
export { strings }
