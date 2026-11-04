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
  de: {
    TOTAL: 'Gesamt:',
  },
  pt: {
    TOTAL: 'Total:',
  },
  it: {
    TOTAL: 'Totale:',
  },
  zh: {
    TOTAL: '总计：',
  },
  ja: {
    TOTAL: '合計：',
  },
})

langHelper.setLanguage(strings)
export { strings }
