import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_SUPPLIER: 'Nouveau fournisseur',
    SUPPLIER: 'fournisseur',
    SUPPLIERS: 'fournisseurs',
  },
  en: {
    NEW_SUPPLIER: 'New supplier',
    SUPPLIER: 'supplier',
    SUPPLIERS: 'suppliers',
  },
})

langHelper.setLanguage(strings)
export { strings }
