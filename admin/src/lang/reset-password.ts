import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    RESET_PASSWORD_HEADING: 'Réinitialisation du mot de passe',
    RESET_PASSWORD: 'Veuillez saisir votre adresse e-mail afin de vous envoyer un e-mail pour réinitialiser votre mot de passe.',
    RESET: 'Réinitialiser',
    EMAIL_SENT: 'Si un compte existe pour cette adresse e-mail, les instructions de réinitialisation seront envoyées.',
  },
  en: {
    RESET_PASSWORD_HEADING: 'Password Reset',
    RESET_PASSWORD: 'Please enter your email address so we can send you an email to reset your password.',
    RESET: 'Reset',
    EMAIL_SENT: 'If an account exists for this email address, password reset instructions will be sent.',
  },
  es: {
    RESET_PASSWORD_HEADING: 'Restablecimiento de contraseña',
    RESET_PASSWORD: 'Por favor ingrese su dirección de correo electrónico para que podamos enviarle un correo electrónico para restablecer su contraseña.',
    RESET: 'Restablecer',
    EMAIL_SENT: 'Si existe una cuenta con esta dirección de correo electrónico, se enviarán instrucciones para restablecer la contraseña.',
  },
})

langHelper.setLanguage(strings)
export { strings }
