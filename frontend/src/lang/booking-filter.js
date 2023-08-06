import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

const strings = new LocalizedStrings({
  fr: {
    PICKUP_LOCATION: 'Lieu de prise en charge',
    DROP_OFF_LOCATION: 'Lieu de restitution',
  },
  en: {
    PICKUP_LOCATION: 'Pickup location',
    DROP_OFF_LOCATION: 'Drop-off location',
  },
})

LangHelper.setLanguage(strings)
export { strings }
