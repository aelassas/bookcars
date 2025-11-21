import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

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
  ja: {
    TOTAL: '合計：',
  },
})

langHelper.setLanguage(strings)
export { strings }
