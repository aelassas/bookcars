import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
    fr: {
        UPDATE_LOCATION: 'Modification du lieu',
        LOCATION_UPDATED: 'Lieu modifié avec succès.',
    },
    en: {
        UPDATE_LOCATION: 'Location update',
        LOCATION_UPDATED: 'Location updated successfully.'
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)
