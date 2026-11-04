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
  pt: {
    UPDATE_USER_HEADING: 'Atualização do utilizador',
  },
  it: {
    UPDATE_USER_HEADING: "Modifica dell'utente",
  },
  zh: {
    UPDATE_USER_HEADING: '更新用户',
  },
  ja: {
    UPDATE_USER_HEADING: 'ユーザーの更新',
  },
})

langHelper.setLanguage(strings)
export { strings }
