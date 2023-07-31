import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

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
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)
