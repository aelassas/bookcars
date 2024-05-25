import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    ACTIVATE_HEADING: 'Activation du compte',
    TOKEN_EXPIRED: "Votre lien d'activation du compte a expiré.",
    ACTIVATE: 'Activer',
  },
  en: {
    ACTIVATE_HEADING: 'Account Activation',
    TOKEN_EXPIRED: 'Your account activation link expired.',
    ACTIVATE: 'Activate',
  },
  el: {
     ACTIVATE_HEADING: 'Ενεργοποίηση λογαριασμού',
     TOKEN_EXPIRED: 'Ο σύνδεσμος ενεργοποίησης του λογαριασμού σας έληξε.',
     ACTIVE: 'Ενεργοποίηση',
   },
})

langHelper.setLanguage(strings)
export { strings }
