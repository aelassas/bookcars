import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

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
  es: {
    ACTIVATE_HEADING: 'Activación de cuenta',
    TOKEN_EXPIRED: 'Su enlace de activación de cuenta ha expirado.',
    ACTIVATE: 'Activar',
  },
})

langHelper.setLanguage(strings)
export { strings }
