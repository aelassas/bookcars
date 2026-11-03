import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    UPDATE_USER_HEADING: "Modification de l'utilisateur",
  },
  en: {
    UPDATE_USER_HEADING: 'User update',
  },
  es: {
    UPDATE_USER_HEADING: 'Actualización del usuario',
  },
  de: {
    UPDATE_USER_HEADING: 'Benutzer bearbeiten',
  },
})

langHelper.setLanguage(strings)
export { strings }
