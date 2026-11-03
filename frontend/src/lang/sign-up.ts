import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SIGN_UP_HEADING: 'Inscription',
    SIGN_UP: "S'inscrire",
    SIGN_UP_ERROR: "Une erreur s'est produite lors de l'inscription.",
    SIGN_UP_SUCCESS_HEADING: 'Inscription réussie',
    SIGN_UP_SUCCESS_MESSAGE: "Un e-mail d'activation a été envoyé si cette adresse n'est pas déjà enregistrée. Si vous avez déjà un compte, veuillez vous connecter.",
  },
  en: {
    SIGN_UP_HEADING: 'Register',
    SIGN_UP: 'Register',
    SIGN_UP_ERROR: 'An error occurred during sign up.',
    SIGN_UP_SUCCESS_HEADING: 'Registration Successful',
    SIGN_UP_SUCCESS_MESSAGE: 'An activation email has been sent if this address is not already registered. If you already have an account, please sign in.',
  },
  es: {
    SIGN_UP_HEADING: 'Regístrate',
    SIGN_UP: 'Regístrate',
    SIGN_UP_ERROR: 'Se produjo un error durante el registro.',
    SIGN_UP_SUCCESS_HEADING: 'Registro exitoso',
    SIGN_UP_SUCCESS_MESSAGE: 'Se ha enviado un correo electrónico de activación si esta dirección no está registrada. Si ya tiene una cuenta, inicie sesión.',
  },
  de: {
    SIGN_UP_HEADING: 'Registrieren',
    SIGN_UP: 'Registrieren',
    SIGN_UP_ERROR: 'Bei der Registrierung ist ein Fehler aufgetreten.',
    SIGN_UP_SUCCESS_HEADING: 'Registrierung erfolgreich',
    SIGN_UP_SUCCESS_MESSAGE: 'Eine Aktivierungs-E-Mail wurde gesendet, sofern diese Adresse noch nicht registriert ist. Wenn Sie bereits ein Konto haben, melden Sie sich bitte an.',
  },
})

langHelper.setLanguage(strings)
export { strings }
