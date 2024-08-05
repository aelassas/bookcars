import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    RATING: 'Classement',
  },
  en: {
    RATING: 'Rating',
  },
})

langHelper.setLanguage(strings)
export { strings }
