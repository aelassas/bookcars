import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

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
    ACTIVATE_HEADING: 'Activación de la cuenta',
    TOKEN_EXPIRED: 'El enlace de activación de su cuenta ha expirado.',
    ACTIVATE: 'Activar',
  },
  ja: {
    ACTIVATE_HEADING: 'アカウント有効化',
    TOKEN_EXPIRED: 'アカウント有効化リンクの有効期限が切れています。',
    ACTIVATE: '有効化',
  },
})

langHelper.setLanguage(strings)
export { strings }
