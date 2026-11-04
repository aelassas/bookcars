import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    TITLE: 'Contrats',
  },
  en: {
    TITLE: 'Contracts',
  },
  es: {
    TITLE: 'Contratos',
  },
  de: {
    TITLE: 'Verträge',
  },
  pt: {
    TITLE: 'Contratos',
  },
  it: {
    TITLE: 'Contratti',
  },
  zh: {
    TITLE: '合同',
  },
  ja: {
    TITLE: '契約書',
  },
})

langHelper.setLanguage(strings)
export { strings }
