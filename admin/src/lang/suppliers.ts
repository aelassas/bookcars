import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

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
  es: {
    NEW_SUPPLIER: 'Nuevo proveedor',
    SUPPLIER: 'proveedor',
    SUPPLIERS: 'proveedores',
  },
  de: {
    NEW_SUPPLIER: 'Neuer Anbieter',
    SUPPLIER: 'Anbieter',
    SUPPLIERS: 'Anbieter',
  },
  pt: {
    NEW_SUPPLIER: 'Novo fornecedor',
    SUPPLIER: 'fornecedor',
    SUPPLIERS: 'fornecedores',
  },
})

langHelper.setLanguage(strings)
export { strings }
