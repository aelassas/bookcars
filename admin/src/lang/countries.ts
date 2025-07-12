import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_COUNTRY: 'Nouveau pays',
    DELETE_COUNTRY: 'Êtes-vous sûr de vouloir supprimer ce pays ?',
    CANNOT_DELETE_COUNTRY: 'Ce pays ne peut pas être supprimé car il est lié à des lieux.',
    EMPTY_LIST: 'Pas de pays.',
    COUNTRY: 'pays',
    COUNTRIES: 'pays',
  },
  en: {
    NEW_COUNTRY: 'New country',
    DELETE_COUNTRY: 'Are you sure you want to delete this country?',
    CANNOT_DELETE_COUNTRY: 'This country cannot be deleted because it is related to locations.',
    EMPTY_LIST: 'No countries.',
    COUNTRY: 'country',
    COUNTRIES: 'countries',
  },
  es: {
    NEW_COUNTRY: 'Nuevo país',
    DELETE_COUNTRY: '¿Estás seguro de que quieres eliminar este país?',
    CANNOT_DELETE_COUNTRY: 'Este país no puede ser eliminado porque está relacionado con ubicaciones.',
    EMPTY_LIST: 'No hay países.',
    COUNTRY: 'país',
    COUNTRIES: 'países',
  },
})

langHelper.setLanguage(strings)
export { strings }
