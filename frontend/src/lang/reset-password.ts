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
    RESET_PASSWORD_HEADING: 'Restablecer contraseña',
    RESET_PASSWORD: 'Ingrese su dirección de correo electrónico para que podamos enviarle un correo electrónico para restablecer su contraseña.',
    RESET: 'Restablecer',
    EMAIL_SENT: 'Si existe una cuenta con esta dirección de correo electrónico, se enviarán instrucciones para restablecer la contraseña.',
  },
  de: {
    RESET_PASSWORD_HEADING: 'Passwort zurücksetzen',
    RESET_PASSWORD: 'Bitte geben Sie Ihre E-Mail-Adresse ein, damit wir Ihnen eine E-Mail zum Zurücksetzen Ihres Passworts senden können.',
    RESET: 'Zurücksetzen',
    EMAIL_SENT: 'Falls für diese E-Mail-Adresse ein Konto existiert, werden Anweisungen zum Zurücksetzen des Passworts gesendet.',
  },
  pt: {
    RESET_PASSWORD_HEADING: 'Repor palavra-passe',
    RESET_PASSWORD: 'Introduza o seu endereço de e-mail para que possamos enviar-lhe um e-mail para repor a sua palavra-passe.',
    RESET: 'Repor',
    EMAIL_SENT: 'Se existir uma conta associada a este endereço de e-mail, serão enviadas instruções para repor a palavra-passe.',
  },
  it: {
    RESET_PASSWORD_HEADING: 'Reimposta password',
    RESET_PASSWORD: 'Inserisci il tuo indirizzo e-mail in modo che possiamo inviarti un messaggio per reimpostare la tua password.',
    RESET: 'Reimposta',
    EMAIL_SENT: 'Se esiste un account associato a questo indirizzo e-mail, verranno inviate le istruzioni per reimpostare la password.',
  },
  zh: {
    RESET_PASSWORD_HEADING: '重置密码',
    RESET_PASSWORD: '请输入您的电子邮箱地址，我们将向您发送用于重置密码的邮件。',
    RESET: '重置',
    EMAIL_SENT: '如果该电子邮箱地址已注册账户，我们将发送重置密码的说明。',
  },
  ja: {
    RESET_PASSWORD_HEADING: 'パスワードのリセット',
    RESET_PASSWORD: 'パスワードをリセットするためのメールをお送りしますので、メールアドレスを入力してください。',
    RESET: 'リセット',
    EMAIL_SENT: 'このメールアドレスのアカウントが存在する場合、パスワードのリセット手順を送信します。',
  },
})

langHelper.setLanguage(strings)
export { strings }
