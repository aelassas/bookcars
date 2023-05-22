import LocalizedStrings from 'react-localization'
import Env from '../config/env.config'
import * as UserService from '../services/UserService'

export const strings = new LocalizedStrings({
    fr: {
        NO_MATCH: 'Rien à voir ici !'
    },
    en: {
        NO_MATCH: 'Nothing to see here!'
    },
    pl: {
        NO_MATCH: 'Nic tu nie ma!'
    }
})

let language = UserService.getQueryLanguage()

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage()
}

strings.setLanguage(language)
