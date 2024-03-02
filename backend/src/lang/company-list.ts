import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    EMPTY_LIST: 'Pas de fournisseurs.',
    VIEW_COMPANY: 'Voir le profil de ce fournisseur',
    DELETE_COMPANY: 'Êtes-vous sûr de vouloir supprimer ce fournisseur et toutes ses données ?',
  },
  en: {
    EMPTY_LIST: 'No suppliers.',
    VIEW_COMPANY: 'View supplier profile',
    DELETE_COMPANY: 'Are you sure you want to delete this supplier and all its data?',
  },
})

langHelper.setLanguage(strings)
export { strings }
