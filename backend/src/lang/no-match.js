import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
    fr: {
        NO_MATCH: 'Rien à voir ici !'
    },
    en: {
        NO_MATCH: 'Nothing to see here!'
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)
