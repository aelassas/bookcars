import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

const strings = new LocalizedStrings({
  fr: {
    UPDATE_USER_HEADING: "Modification de l'utilisateur",
  },
  en: {
    UPDATE_USER_HEADING: 'User update',
  },
})

LangHelper.setLanguage(strings)
export { strings }
