import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_COMPANY: 'Nouveau fournisseur',
    COMPANY: 'fournisseur',
    COMPANIES: 'fournisseurs',
  },
  en: {
    NEW_COMPANY: 'New supplier',
    COMPANY: 'supplier',
    COMPANIES: 'suppliers',
  },
})

LangHelper.setLanguage(strings)
export { strings }
