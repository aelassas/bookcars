import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    UNAUTHORIZED: 'Accès non autorisé',
  },
  en: {
    UNAUTHORIZED: 'Unauthorized access',
  },
  es: {
    UNAUTHORIZED: 'Acceso no autorizado',
  },
})

langHelper.setLanguage(strings)
export { strings }
