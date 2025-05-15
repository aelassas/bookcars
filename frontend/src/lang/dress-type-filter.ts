import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    TYPE: 'Type',
    WEDDING: 'Mariage',
    EVENING: 'Soirée',
    COCKTAIL: 'Cocktail',
    PROM: 'Bal',
    CASUAL: 'Décontracté',
  },
  en: {
    TYPE: 'Type',
    WEDDING: 'Wedding',
    EVENING: 'Evening',
    COCKTAIL: 'Cocktail',
    PROM: 'Prom',
    CASUAL: 'Casual',
  },
  es: {
    TYPE: 'Tipo',
    WEDDING: 'Boda',
    EVENING: 'Noche',
    COCKTAIL: 'Cóctel',
    PROM: 'Graduación',
    CASUAL: 'Casual',
  },
})

langHelper.setLanguage(strings)
export { strings }
