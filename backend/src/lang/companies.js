import LocalizedStrings from 'react-localization'
import Env from '../config/env.config'
import * as UserService from '../services/UserService'

export const strings = new LocalizedStrings({
    fr: {
        NEW_COMPANY: 'Nouveau fournisseur',
        COMPANY: 'fournisseur',
        COMPANIES: 'fournisseurs'
    },
    en: {
        NEW_COMPANY: 'New supplier',
        COMPANY: 'supplier',
        COMPANIES: 'suppliers'
    },
    pl: {
        NEW_COMPANY: 'Nowy dostawca',
        COMPANY: 'dostawca',
        COMPANIES: 'dostawcy'
    }
})

let language = UserService.getQueryLanguage()

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage()
}

strings.setLanguage(language)
