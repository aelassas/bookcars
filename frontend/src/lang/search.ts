import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SHOW_FILTERS: 'Afficher les filtres',
    HILE_FILTERS: 'Masquer les filtres',
  },
  en: {
    SHOW_FILTERS: 'Show Filters',
    HILE_FILTERS: 'Hide Filters',
  },
  es: {
    SHOW_FILTERS: 'Mostrar filtros',
    HILE_FILTERS: 'Ocultar filtros',
  },
  de: {
    SHOW_FILTERS: 'Filter anzeigen',
    HILE_FILTERS: 'Filter ausblenden',
  },
  pt: {
    SHOW_FILTERS: 'Mostrar filtros',
    HILE_FILTERS: 'Ocultar filtros',
  },
  it: {
    SHOW_FILTERS: 'Mostra filtri',
    HILE_FILTERS: 'Nascondi filtri',
  },
  zh: {
    SHOW_FILTERS: '显示筛选',
    HILE_FILTERS: '隐藏筛选',
  },
  ja: {
    SHOW_FILTERS: 'フィルターを表示',
    HILE_FILTERS: 'フィルターを非表示',
  },
})

langHelper.setLanguage(strings)
export { strings }
