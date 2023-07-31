import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
    fr: {
        NEW_BOOKING_HEADING: 'Nouvelle réservation'
    },
    en: {
        NEW_BOOKING_HEADING: 'New booking'
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)
