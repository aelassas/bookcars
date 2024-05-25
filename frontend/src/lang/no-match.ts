import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NO_MATCH: 'Rien à voir ici !',
  },
  en: {
    NO_MATCH: 'Nothing to see here!',
  },
  el: {
     NO_MATCH: 'Δεν υπάρχει τίποτα να δείτε εδώ!',
   },
})

langHelper.setLanguage(strings)
export { strings }
