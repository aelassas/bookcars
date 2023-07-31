import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
    fr: {
        REQUIRED_FIELD: 'Veuillez renseigner le champ : ',
        REQUIRED_FIELDS: 'Veuillez renseigner les champs : ',
    },
    en: {
        REQUIRED_FIELD: 'Please fill in the field: ',
        REQUIRED_FIELDS: 'Please fill in the fields: ',
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)
