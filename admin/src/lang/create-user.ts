import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    CREATE_USER_HEADING: 'Nouvelle utilisateur',
    BIRTH_DATE: 'Date de naissance',
  },
  en: {
    CREATE_USER_HEADING: 'New user',
    BIRTH_DATE: 'Birth date',
  },
  es: {
    CREATE_USER_HEADING: 'Nuevo usuario',
    BIRTH_DATE: 'Fecha de nacimiento',
  },
  de: {
    CREATE_USER_HEADING: 'Neuer Benutzer',
    BIRTH_DATE: 'Geburtsdatum',
  },
  pt: {
    CREATE_USER_HEADING: 'Novo utilizador',
    BIRTH_DATE: 'Data de nascimento',
  },
  it: {
    CREATE_USER_HEADING: 'Nuovo utente',
    BIRTH_DATE: 'Data di nascita',
  },
  zh: {
    CREATE_USER_HEADING: '新增用户',
    BIRTH_DATE: '出生日期',
  },
  ja: {
    CREATE_USER_HEADING: '新規ユーザー',
    BIRTH_DATE: '生年月日',
  },
})

langHelper.setLanguage(strings)
export { strings }
