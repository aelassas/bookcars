import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

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
  de: {
    SIGN_UP_HEADING: 'Registrieren',
    TOS_SIGN_UP: 'Ich habe die Nutzungsbedingungen gelesen und stimme ihnen zu.',
    SIGN_UP: 'Registrieren',
    RECAPTCHA_ERROR: 'Füllen Sie das Captcha aus, um fortzufahren.',
    SIGN_UP_ERROR: 'Bei der Registrierung ist ein Fehler aufgetreten.',
  },
  pt: {
    SIGN_UP_HEADING: 'Registar',
    TOS_SIGN_UP: 'Li e concordo com os Termos de Utilização.',
    SIGN_UP: 'Registar',
    RECAPTCHA_ERROR: 'Preencha o captcha para continuar.',
    SIGN_UP_ERROR: 'Ocorreu um erro durante o registo.',
  },
  it: {
    SIGN_UP_HEADING: 'Registrati',
    TOS_SIGN_UP: 'Ho letto e accetto i Termini di utilizzo.',
    SIGN_UP: 'Registrati',
    RECAPTCHA_ERROR: 'Completa il captcha per continuare.',
    SIGN_UP_ERROR: 'Si è verificato un errore durante la registrazione.',
  },
  zh: {
    SIGN_UP_HEADING: '注册',
    TOS_SIGN_UP: '我已阅读并同意使用条款。',
    SIGN_UP: '注册',
    RECAPTCHA_ERROR: '请完成验证码以继续。',
    SIGN_UP_ERROR: '注册时出错。',
  },
  ja: {
    SIGN_UP_HEADING: '新規登録',
    TOS_SIGN_UP: '利用規約を読み、同意します。',
    SIGN_UP: '新規登録',
    RECAPTCHA_ERROR: '続行するにはCAPTCHAを完了してください。',
    SIGN_UP_ERROR: '登録中にエラーが発生しました。',
  },
})

langHelper.setLanguage(strings)
export { strings }
