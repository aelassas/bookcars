import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

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

langHelper.setLanguage(strings)
export { strings }
