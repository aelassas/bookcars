import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    RATING: 'Classement',
    RATING_1: '(1 et plus)',
    RATING_2: '(2 et plus)',
    RATING_3: '(3 et plus)',
    RATING_4: '(4 et plus)',
  },
  en: {
    RATING: 'Rating',
    RATING_1: '(1 and up)',
    RATING_2: '(2 and up)',
    RATING_3: '(3 and up)',
    RATING_4: '(4 and up)',
  },
  es: {
    RATING: 'Clasificación',
    RATING_1: '(1 y más)',
    RATING_2: '(2 y más)',
    RATING_3: '(3 y más)',
    RATING_4: '(4 y más)',
  },
})

langHelper.setLanguage(strings)
export { strings }
