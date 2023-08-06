import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

const strings = new LocalizedStrings({
  fr: {
    REQUIRED_FIELD: 'Veuillez renseigner le champ : ',
    REQUIRED_FIELDS: 'Veuillez renseigner les champs : ',
  },
  en: {
    REQUIRED_FIELD: 'Please fill in the field: ',
    REQUIRED_FIELDS: 'Please fill in the fields: ',
  },
})

LangHelper.setLanguage(strings)
export { strings }
