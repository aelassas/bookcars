import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

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
  ar: {
    CONTACT_HEADING: 'اتصل بنا',
    SUBJECT: 'الموضوع',
    MESSAGE: 'الرسالة',
    SEND: 'إرسال',
    MESSAGE_SENT: 'تم إرسال الرسالة',
  },
})

langHelper.setLanguage(strings)
export { strings }
