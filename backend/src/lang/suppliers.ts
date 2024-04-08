import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

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

langHelper.setLanguage(strings)
export { strings }
