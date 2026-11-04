import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NO_MATCH: 'Rien à voir ici !',
  },
  en: {
    NO_MATCH: 'Nothing to see here!',
  },
  es: {
    NO_MATCH: '¡Nada que ver aquí!',
  },
  de: {
    NO_MATCH: 'Hier gibt es nichts zu sehen!',
  },
  pt: {
    NO_MATCH: 'Nada para ver aqui!',
  },
})

langHelper.setLanguage(strings)
export { strings }
