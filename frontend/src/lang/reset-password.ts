import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    RESET_PASSWORD_HEADING: 'Réinitialisation du mot de passe',
    RESET_PASSWORD: 'Veuillez saisir votre adresse e-mail afin de vous envoyer un e-mail pour réinitialiser votre mot de passe.',
    EMAIL_ERROR: 'Adresse e-mail non enregistrée',
    RESET: 'Réinitialiser',
    EMAIL_SENT: 'E-mail de réinitialisation du mot de passe envoyé.',
  },
  en: {
    RESET_PASSWORD_HEADING: 'Password Reset',
    RESET_PASSWORD: 'Please enter your email address so we can send you an email to reset your password.',
    EMAIL_ERROR: 'Email address not registered',
    RESET: 'Reset',
    EMAIL_SENT: 'Password reset email sent.',
  },
  el: {
    RESET_PASSWORD_HEADING: 'Επαναφορά κωδικού πρόσβασης',
    RESET_PASSWORD: 'Παρακαλώ εισάγετε τη διεύθυνση ηλεκτρονικού ταχυδρομείου σας ώστε να σας στείλουμε ένα μήνυμα ηλεκτρονικού ταχυδρομείου για την επαναφορά του κωδικού πρόσβασής σας.',
    EMAIL_ERROR: 'Η διεύθυνση ηλεκτρονικού ταχυδρομείου δεν έχει καταχωρηθεί',
    RESET: 'Επαναφορά του κωδικού πρόσβασης',
    EMAIL_SENT: 'Αποστολή email επαναφοράς κωδικού πρόσβασης.',
  },
})

langHelper.setLanguage(strings)
export { strings }
