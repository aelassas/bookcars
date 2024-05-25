import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SIGN_IN_HEADING: 'Connexion',
    SIGN_IN: 'Se connecter',
    SIGN_UP: "S'inscrire",
    ERROR_IN_SIGN_IN: 'E-mail ou mot de passe incorrect.',
    IS_BLACKLISTED: 'Votre compte est suspendu.',
    RESET_PASSWORD: 'Mot de passe oublié ?',
    STAY_CONNECTED: 'Rester connecté',
  },
  en: {
    SIGN_IN_HEADING: 'Sign in',
    SIGN_IN: 'Sign in',
    SIGN_UP: 'Sign up',
    ERROR_IN_SIGN_IN: 'Incorrect email or password.',
    IS_BLACKLISTED: 'Your account is suspended.',
    RESET_PASSWORD: 'Forgot password?',
    STAY_CONNECTED: 'Stay connected',
  },
  el: {
    SIGN_IN_HEADING: 'Είσοδος',
    SIGN_IN: 'Είσοδος',
    SIGN_UP: 'Εγγραφή',
    ERROR_IN_SIGN_IN: 'Λάθος email ή κωδικός πρόσβασης.',
    IS_BLACKLISTED: 'Ο λογαριασμός σας έχει ανασταλεί.',
    RESET_PASSWORD: 'Ξεχάσατε τον κωδικό πρόσβασης;',
    STAY_CONNECTED: 'Μείνετε συνδεδεμένοι',
      },
})

langHelper.setLanguage(strings)
export { strings }
