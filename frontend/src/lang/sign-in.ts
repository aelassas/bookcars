import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SIGN_IN_HEADING: 'Connexion',
    SIGN_IN: 'Se connecter',
    ERROR_IN_SIGN_IN: 'E-mail ou mot de passe incorrect.',
    IS_BLACKLISTED: 'Votre compte est suspendu.',
    RESET_PASSWORD: 'Mot de passe oublié ?',
    STAY_CONNECTED: 'Rester connecté',
  },
  en: {
    SIGN_IN_HEADING: 'Sign in',
    SIGN_IN: 'Sign in',
    ERROR_IN_SIGN_IN: 'Incorrect email or password.',
    IS_BLACKLISTED: 'Your account is suspended.',
    RESET_PASSWORD: 'Forgot password?',
    STAY_CONNECTED: 'Stay connected',
  },
  es: {
    SIGN_IN_HEADING: 'Iniciar sesión',
    SIGN_IN: 'Iniciar sesión',
    ERROR_IN_SIGN_IN: 'Correo electrónico o contraseña incorrectos.',
    IS_BLACKLISTED: 'Su cuenta está suspendida?',
    RESET_PASSWORD: '¿Olvidó su contraseña?',
    STAY_CONNECTED: 'Manténgase conectado',
  },
  de: {
    SIGN_IN_HEADING: 'Anmelden',
    SIGN_IN: 'Anmelden',
    ERROR_IN_SIGN_IN: 'E-Mail oder Passwort ist falsch.',
    IS_BLACKLISTED: 'Ihr Konto ist gesperrt.',
    RESET_PASSWORD: 'Passwort vergessen?',
    STAY_CONNECTED: 'Angemeldet bleiben',
  },
  pt: {
    SIGN_IN_HEADING: 'Iniciar sessão',
    SIGN_IN: 'Iniciar sessão',
    ERROR_IN_SIGN_IN: 'E-mail ou palavra-passe incorretos.',
    IS_BLACKLISTED: 'A sua conta está suspensa.',
    RESET_PASSWORD: 'Esqueceu-se da palavra-passe?',
    STAY_CONNECTED: 'Manter sessão iniciada',
  },
  it: {
    SIGN_IN_HEADING: 'Accedi',
    SIGN_IN: 'Accedi',
    ERROR_IN_SIGN_IN: 'E-mail o password non corretta.',
    IS_BLACKLISTED: 'Il tuo account è sospeso.',
    RESET_PASSWORD: 'Password dimenticata?',
    STAY_CONNECTED: 'Resta connesso',
  },
  zh: {
    SIGN_IN_HEADING: '登录',
    SIGN_IN: '登录',
    ERROR_IN_SIGN_IN: '邮箱或密码不正确。',
    IS_BLACKLISTED: '您的账户已被停用。',
    RESET_PASSWORD: '忘记密码？',
    STAY_CONNECTED: '保持登录状态',
  },
  ja: {
    SIGN_IN_HEADING: 'ログイン',
    SIGN_IN: 'ログイン',
    ERROR_IN_SIGN_IN: 'メールアドレスまたはパスワードが正しくありません。',
    IS_BLACKLISTED: 'アカウントが停止されています。',
    RESET_PASSWORD: 'パスワードをお忘れですか？',
    STAY_CONNECTED: 'ログイン状態を保持する',
  },
})

langHelper.setLanguage(strings)
export { strings }
