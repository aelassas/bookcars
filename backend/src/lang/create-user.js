import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
    fr: {
        CREATE_USER_HEADING: 'Nouvelle utilisateur',
        BIRTH_DATE: 'Date de naissance'
    },
    en: {
        CREATE_USER_HEADING: 'New user',
        BIRTH_DATE: 'Birth date'
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)
