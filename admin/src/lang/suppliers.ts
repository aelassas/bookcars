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
  it: {
    NEW_SUPPLIER: 'Nuovo fornitore',
    SUPPLIER: 'fornitore',
    SUPPLIERS: 'fornitori',
  },
  zh: {
    NEW_SUPPLIER: '新建供应商',
    SUPPLIER: '供应商',
    SUPPLIERS: '供应商',
  },
  ja: {
    NEW_SUPPLIER: '新規サプライヤー',
    SUPPLIER: 'サプライヤー',
    SUPPLIERS: 'サプライヤー',
  },
})

langHelper.setLanguage(strings)
export { strings }
