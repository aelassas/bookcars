import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SIZE: 'Taille',
    XS: 'XS',
    S: 'S',
    M: 'M',
    L: 'L',
    XL: 'XL',
    XXL: 'XXL',
    CUSTOM: 'Sur mesure',
  },
  en: {
    SIZE: 'Size',
    XS: 'XS',
    S: 'S',
    M: 'M',
    L: 'L',
    XL: 'XL',
    XXL: 'XXL',
    CUSTOM: 'Custom',
  },
  es: {
    SIZE: 'Talla',
    XS: 'XS',
    S: 'S',
    M: 'M',
    L: 'L',
    XL: 'XL',
    XXL: 'XXL',
    CUSTOM: 'Personalizada',
  },
})

langHelper.setLanguage(strings)
export { strings }
