import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    TITLE: 'Abonnez-vous',
    SUB_TITLE: 'Abonnez-vous à notre liste de diffusion pour recevoir les dernières mises à jour !',
    SUBSCRIBE: "S'abonner",
    SUCCESS: 'Inscription réussie !',
  },
  en: {
    TITLE: 'Subscribe',
    SUB_TITLE: 'Subscribe to our mailing list for the latest updates!',
    SUBSCRIBE: 'Subscribe',
    SUCCESS: 'Subscription successful!',
  },
  es: {
    TITLE: 'Suscribir',
    SUB_TITLE: '¡Suscríbete a nuestra lista de correo para recibir las últimas actualizaciones!',
    SUBSCRIBE: 'Suscribir',
    SUCCESS: '¡Suscripción exitosa!',
  },
  de: {
    TITLE: 'Abonnieren',
    SUB_TITLE: 'Abonnieren Sie unseren Newsletter, um immer die neuesten Informationen zu erhalten!',
    SUBSCRIBE: 'Abonnieren',
    SUCCESS: 'Anmeldung erfolgreich!',
  },
  pt: {
    TITLE: 'Subscrever',
    SUB_TITLE: 'Subscreva a nossa lista de correio para receber as últimas novidades!',
    SUBSCRIBE: 'Subscrever',
    SUCCESS: 'Subscrição efetuada com sucesso!',
  },
  it: {
    TITLE: 'Iscriviti',
    SUB_TITLE: 'Iscriviti alla nostra mailing list per ricevere gli ultimi aggiornamenti!',
    SUBSCRIBE: 'Iscriviti',
    SUCCESS: 'Iscrizione completata!',
  },
  zh: {
    TITLE: '订阅',
    SUB_TITLE: '订阅我们的邮件列表，获取最新资讯！',
    SUBSCRIBE: '订阅',
    SUCCESS: '订阅成功！',
  },
  ja: {
    TITLE: '購読する',
    SUB_TITLE: 'メーリングリストに登録して、最新情報を受け取りましょう！',
    SUBSCRIBE: '購読する',
    SUCCESS: '購読が完了しました！',
  },
})

langHelper.setLanguage(strings)
export { strings }
