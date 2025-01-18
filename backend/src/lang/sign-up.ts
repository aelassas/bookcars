import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SIGN_UP_HEADING: 'Inscription',
    TOS_SIGN_UP: "J'ai lu et j'accepte les conditions générales d'utilisation.",
    SIGN_UP: "S'inscrire",
    RECAPTCHA_ERROR: 'Veuillez remplir le captcha pour continuer.',
    SIGN_UP_ERROR: "Une erreur s'est produite lors de l'inscription.",
  },
  en: {
    SIGN_UP_HEADING: 'Sign up',
    TOS_SIGN_UP: 'I read and agree with the Terms of Use.',
    SIGN_UP: 'Sign up',
    RECAPTCHA_ERROR: 'Fill out the captcha to continue.',
    SIGN_UP_ERROR: 'An error occurred during sign up.',
  },
  es: {
    SIGN_UP_HEADING: 'Registrarse',
    TOS_SIGN_UP: 'He leído y acepto los Términos de uso.',
    SIGN_UP: 'Registrarse',
    RECAPTCHA_ERROR: 'Complete el captcha para continuar.',
    SIGN_UP_ERROR: 'Se produjo un error durante el registro.',
  },
})

langHelper.setLanguage(strings)
export { strings }
