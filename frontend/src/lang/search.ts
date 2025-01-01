import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    VIEW_ON_MAP: 'Voir sur la carte',
    SHOW_FILTERS: 'Afficher les filtres',
    HILE_FILTERS: 'Masquer les filtres',
  },
  en: {
    VIEW_ON_MAP: 'View on map',
    SHOW_FILTERS: 'Show Filters',
    HILE_FILTERS: 'Hide Filters',
  },
  es: {
    VIEW_ON_MAP: 'Ver en el mapa',
    SHOW_FILTERS: 'Mostrar filtros',
    HILE_FILTERS: 'Ocultar filtros',
  },
})

langHelper.setLanguage(strings)
export { strings }
