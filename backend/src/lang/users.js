import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
    fr: {
        NEW_USER: 'Nouvel utilisateur'
    },
    en: {
        NEW_USER: 'New user'
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)
