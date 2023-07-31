import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
    fr: {
        PICKUP_LOCATION: 'Lieu de prise en charge',
        DROP_OFF_LOCATION: 'Lieu de restitution',
    },
    en: {
        PICKUP_LOCATION: 'Pickup location',
        DROP_OFF_LOCATION: 'Drop-off location',
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)
