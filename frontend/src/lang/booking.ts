import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    TOTAL: 'Total :',
  },
  en: {
    TOTAL: 'Total:',
  },
  es: {
    TOTAL: 'Total:',
  },
  ar: {
    TOTAL: 'المجموع:',
  },
})

langHelper.setLanguage(strings)
export { strings }
