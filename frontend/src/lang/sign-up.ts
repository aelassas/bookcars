import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SIGN_UP_HEADING: 'Inscription',
    SIGN_UP: "S'inscrire",
    SIGN_UP_ERROR: "Une erreur s'est produite lors de l'inscription.",
  },
  en: {
    SIGN_UP_HEADING: 'Sign up',
    SIGN_UP: 'Sign up',
    SIGN_UP_ERROR: 'An error occurred during sign up.',
  },
  el: {
    SIGN_UP_HEADING: 'Εγγραφείτε',
    SIGN_UP: 'Εγγραφείτε',
    SIGN_UP_ERROR: 'Παρουσιάστηκε σφάλμα κατά την εγγραφή.',
  },
})

langHelper.setLanguage(strings)
export { strings }
