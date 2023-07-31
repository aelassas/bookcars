import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
    fr: {
        UNAUTHORIZED: 'Accès non autorisé'
    },
    en: {
        UNAUTHORIZED: 'Unauthorized access'
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)
