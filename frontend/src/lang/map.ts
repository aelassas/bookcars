import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SELECT_PICK_UP_LOCATION: 'Choisir ce lieu',
    SELECT_DROP_OFF_LOCATION: 'Choisir comme lieu de restitution',
  },
  en: {
    SELECT_PICK_UP_LOCATION: 'Select Location',
    SELECT_DROP_OFF_LOCATION: 'Set as Drop-off Location',
  },
  el: {
    SELECT_PICK_UP_LOCATION: 'Επιλέξτε ως τοποθεσία παραλαβής',
    SELECT_DROP_OFF_LOCATION: 'Επιλέξτε ως Θέση απόρριψης',
  },
})

langHelper.setLanguage(strings)
export { strings }
