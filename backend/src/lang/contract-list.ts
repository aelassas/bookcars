import LocalizedStrings from 'react-localization'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    TITLE: 'Contrats',
  },
  en: {
    TITLE: 'Contracts',
  },
  es: {
    TITLE: 'Contratos',
  }
})

langHelper.setLanguage(strings)
export { strings }
