import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    CONTACT_HEADING: 'Contact',
    SUBJECT: 'Objet',
    MESSAGE: 'Message',
    SEND: 'Envoyer',
    MESSAGE_SENT: 'Message envoyé',
  },
  en: {
    CONTACT_HEADING: 'Contact',
    SUBJECT: 'Subject',
    MESSAGE: 'Message',
    SEND: 'Send',
    MESSAGE_SENT: 'Message sent'
  },
  es: {
    CONTACT_HEADING: 'Contacto',
    SUBJECT: 'Asunto',
    MESSAGE: 'Mensaje',
    SEND: 'Enviar',
    MESSAGE_SENT: 'Mensaje enviado',
  },
  de: {
    CONTACT_HEADING: 'Kontakt',
    SUBJECT: 'Betreff',
    MESSAGE: 'Nachricht',
    SEND: 'Senden',
    MESSAGE_SENT: 'Nachricht gesendet',
  },
  pt: {
    CONTACT_HEADING: 'Contacto',
    SUBJECT: 'Assunto',
    MESSAGE: 'Mensagem',
    SEND: 'Enviar',
    MESSAGE_SENT: 'Mensagem enviada',
  },
  it: {
    CONTACT_HEADING: 'Contatti',
    SUBJECT: 'Oggetto',
    MESSAGE: 'Messaggio',
    SEND: 'Invia',
    MESSAGE_SENT: 'Messaggio inviato',
  },
  zh: {
    CONTACT_HEADING: '联系我们',
    SUBJECT: '主题',
    MESSAGE: '留言',
    SEND: '发送',
    MESSAGE_SENT: '留言已发送',
  },
  ja: {
    CONTACT_HEADING: 'お問い合わせ',
    SUBJECT: '件名',
    MESSAGE: 'メッセージ',
    SEND: '送信',
    MESSAGE_SENT: 'メッセージを送信しました',
  },
})

langHelper.setLanguage(strings)
export { strings }
