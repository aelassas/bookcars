import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
    fr: {
        NEW_BOOKING: 'Nouvelle réservation',
    },
    en: {
        NEW_BOOKING: 'New Booking',
    }
})

LangHelper.setLanguage(strings)
