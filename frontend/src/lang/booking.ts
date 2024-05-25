import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    TOTAL: 'Total :',
  },
  en: {
    TOTAL: 'Total:',
  },
  el: {
  TOTAL: 'Σύνολο:',
},
})

langHelper.setLanguage(strings)
export { strings }
