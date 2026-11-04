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
  pt: {
    SIGN_UP_HEADING: 'Registar',
    SIGN_UP: 'Registar',
    SIGN_UP_ERROR: 'Ocorreu um erro durante o registo.',
    SIGN_UP_SUCCESS_HEADING: 'Registo efetuado com sucesso',
    SIGN_UP_SUCCESS_MESSAGE: 'Foi enviado um e-mail de ativação, caso este endereço ainda não esteja registado. Se já tem uma conta, inicie sessão.',
  },
  it: {
    SIGN_UP_HEADING: 'Registrati',
    SIGN_UP: 'Registrati',
    SIGN_UP_ERROR: 'Si è verificato un errore durante la registrazione.',
    SIGN_UP_SUCCESS_HEADING: 'Registrazione completata',
    SIGN_UP_SUCCESS_MESSAGE: "Se questo indirizzo non è già registrato, è stata inviata un'e-mail di attivazione. Se hai già un account, effettua l'accesso.",
  },
  zh: {
    SIGN_UP_HEADING: '注册',
    SIGN_UP: '注册',
    SIGN_UP_ERROR: '注册时出错。',
    SIGN_UP_SUCCESS_HEADING: '注册成功',
    SIGN_UP_SUCCESS_MESSAGE: '如果该邮箱地址尚未注册，我们已向其发送激活邮件。如果您已有账户，请直接登录。',
  },
  ja: {
    SIGN_UP_HEADING: '新規登録',
    SIGN_UP: '新規登録',
    SIGN_UP_ERROR: '登録中にエラーが発生しました。',
    SIGN_UP_SUCCESS_HEADING: '登録が完了しました',
    SIGN_UP_SUCCESS_MESSAGE: 'このメールアドレスが未登録の場合、アクティベーションメールを送信しました。すでにアカウントをお持ちの場合は、ログインしてください。',
  },
})

langHelper.setLanguage(strings)
export { strings }
