import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'
import env from '@/config/env.config'

const strings = new LocalizedStrings({
  fr: {
    CONGRATULATIONS: 'Félicitation!',
    SUCCESS: 'Votre paiement a été effectué avec succès. Nous vous avons envoyé un e-mail de confirmation.',
    SUCCESS_PAY_LATER: 'Votre réservation a été effectuée avec succès. Nous vous avons envoyé un e-mail de confirmation.',
    ERROR: 'Une erreur est survenue ! Veuillez réessayer plus tard',
    STATUS_TITLE: `${env.WEBSITE_NAME} Confirmation de réservation`,
    STATUS_MESSAGE: "Vérifiez votre boîte mail et suivez les étapes décrites dans l'e-mail de confirmation de réservation pour réserver votre voiture.",
    SESSION_ID_MISMATCH: 'ID de session non correspondant. Veuillez réessayer.',
  },
  en: {
    CONGRATULATIONS: 'Congratulations!',
    SUCCESS: 'Your payment was successfully done. We sent you a confirmation email.',
    SUCCESS_PAY_LATER: 'Your booking was successfully done. We sent you a confirmation email.',
    ERROR: 'Something went wrong! Try again later',
    STATUS_TITLE: `${env.WEBSITE_NAME} Booking Confirmation`,
    STATUS_MESSAGE: 'Check your mailbox and follow the steps described in the booking confirmation email to book your car.',
    SESSION_ID_MISMATCH: 'Session ID mismatch. Please try again.',
  },
  es: {
    CONGRATULATIONS: '¡Felicitaciones!',
    SUCCESS: 'Tu pago se realizó con éxito. Te hemos enviado un correo de confirmación.',
    SUCCESS_PAY_LATER: 'Tu reserva se ha realizado con éxito. Te hemos enviado un correo de confirmación.',
    ERROR: '¡Algo salió mal! Inténtelo nuevamente más tarde',
    STATUS_TITLE: `${env.WEBSITE_NAME} Confirmación de reserva`,
    STATUS_MESSAGE: 'Revise su buzón de correo y siga los pasos descritos en el correo electrónico de confirmación de reserva para reservar su vehículo.',
    SESSION_ID_MISMATCH: 'ID de sesión no coincide. Por favor, inténtelo de nuevo.',
  },
  de: {
    CONGRATULATIONS: 'Herzlichen Glückwunsch!',
    SUCCESS: 'Ihre Zahlung wurde erfolgreich durchgeführt. Wir haben Ihnen eine Bestätigungs-E-Mail gesendet.',
    SUCCESS_PAY_LATER: 'Ihre Buchung wurde erfolgreich durchgeführt. Wir haben Ihnen eine Bestätigungs-E-Mail gesendet.',
    ERROR: 'Etwas ist schiefgelaufen! Bitte versuchen Sie es später erneut',
    STATUS_TITLE: `${env.WEBSITE_NAME} Buchungsbestätigung`,
    STATUS_MESSAGE: 'Prüfen Sie Ihr E-Mail-Postfach und folgen Sie den Schritten in der Buchungsbestätigungs-E-Mail, um Ihr Auto zu buchen.',
    SESSION_ID_MISMATCH: 'Die Sitzungs-ID stimmt nicht überein. Bitte versuchen Sie es erneut.',
  },
  pt: {
    CONGRATULATIONS: 'Parabéns!',
    SUCCESS: 'O seu pagamento foi efetuado com sucesso. Enviámos-lhe um e-mail de confirmação.',
    SUCCESS_PAY_LATER: 'A sua reserva foi efetuada com sucesso. Enviámos-lhe um e-mail de confirmação.',
    ERROR: 'Algo correu mal! Tente novamente mais tarde',
    STATUS_TITLE: `${env.WEBSITE_NAME} Confirmação de reserva`,
    STATUS_MESSAGE: 'Verifique a sua caixa de correio e siga os passos descritos no e-mail de confirmação de reserva para reservar o seu carro.',
    SESSION_ID_MISMATCH: 'O ID da sessão não corresponde. Por favor, tente novamente.',
  },
  it: {
    CONGRATULATIONS: 'Congratulazioni!',
    SUCCESS: 'Il pagamento è stato effettuato con successo. Ti abbiamo inviato un\'e-mail di conferma.',
    SUCCESS_PAY_LATER: 'La prenotazione è stata effettuata con successo. Ti abbiamo inviato un\'e-mail di conferma.',
    ERROR: 'Qualcosa è andato storto! Riprova più tardi',
    STATUS_TITLE: `${env.WEBSITE_NAME} Conferma della prenotazione`,
    STATUS_MESSAGE: 'Controlla la tua casella di posta e segui i passaggi descritti nell\'e-mail di conferma della prenotazione per prenotare la tua auto.',
    SESSION_ID_MISMATCH: 'L\'ID della sessione non corrisponde. Riprova.',
  },
  zh: {
    CONGRATULATIONS: '恭喜！',
    SUCCESS: '您的付款已成功完成。我们已向您发送了确认邮件。',
    SUCCESS_PAY_LATER: '您的预订已成功完成。我们已向您发送了确认邮件。',
    ERROR: '出错了！请稍后重试',
    STATUS_TITLE: `${env.WEBSITE_NAME} 预订确认`,
    STATUS_MESSAGE: '请查看您的邮箱，并按照预订确认邮件中的步骤预订您的车辆。',
    SESSION_ID_MISMATCH: '会话 ID 不匹配。请重试。',
  },
  ja: {
    CONGRATULATIONS: 'おめでとうございます！',
    SUCCESS: 'お支払いが完了しました。確認メールをお送りしました。',
    SUCCESS_PAY_LATER: 'ご予約が完了しました。確認メールをお送りしました。',
    ERROR: '問題が発生しました。しばらくしてからもう一度お試しください',
    STATUS_TITLE: `${env.WEBSITE_NAME} 予約確認`,
    STATUS_MESSAGE: 'メールボックスをご確認いただき、予約確認メールに記載された手順に従ってお車をご予約ください。',
    SESSION_ID_MISMATCH: 'セッション ID が一致しません。もう一度お試しください。',
  },
})

langHelper.setLanguage(strings)
export { strings }
