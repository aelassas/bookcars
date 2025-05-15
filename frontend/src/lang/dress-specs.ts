import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    DRESS_SPECS: 'Spécificités de la robe',
    CUSTOMIZABLE: 'Personnalisable',
    DESIGNER_MADE: 'Créé par un designer',
    CUSTOM_SIZE: 'Taille sur mesure',
  },
  en: {
    DRESS_SPECS: 'Dress specs',
    CUSTOMIZABLE: 'Customizable',
    DESIGNER_MADE: 'Designer Made',
    CUSTOM_SIZE: 'Custom Size',
  },
  es: {
    DRESS_SPECS: 'Especificaciones del vestido',
    CUSTOMIZABLE: 'Personalizable',
    DESIGNER_MADE: 'Hecho por diseñador',
    CUSTOM_SIZE: 'Talla personalizada',
  },
})

langHelper.setLanguage(strings)
export { strings }
