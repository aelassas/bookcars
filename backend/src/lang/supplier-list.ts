import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    EMPTY_LIST: 'Pas de fournisseurs.',
    VIEW_SUPPLIER: 'Voir le profil de ce fournisseur',
    DELETE_SUPPLIER: 'Êtes-vous sûr de vouloir supprimer ce fournisseur et toutes ses données ?',
  },
  en: {
    EMPTY_LIST: 'No suppliers.',
    VIEW_SUPPLIER: 'View supplier profile',
    DELETE_SUPPLIER: 'Are you sure you want to delete this supplier and all its data?',
  },
})

langHelper.setLanguage(strings)
export { strings }
