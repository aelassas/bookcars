import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
    fr: {
        TOTAL: 'Total :',
        DELETE_BOOKING: 'Êtes-vous sûr de vouloir supprimer cette réservation ?',
    },
    en: {
        TOTAL: 'Total:',
        DELETE_BOOKING: 'Are you sure you want to delete this booking?',
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)
