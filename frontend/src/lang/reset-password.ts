import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

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
  es: {
    RESET_PASSWORD_HEADING: 'Restablecer contraseña',
    RESET_PASSWORD: 'Ingrese su dirección de correo electrónico para que podamos enviarle un correo electrónico para restablecer su contraseña.',
    EMAIL_ERROR: 'Dirección de correo electrónico no registrada',
    RESET: 'Restablecer',
    EMAIL_SENT: 'Correo electrónico de restablecimiento de contraseña enviado.',
  },
})

langHelper.setLanguage(strings)
export { strings }
