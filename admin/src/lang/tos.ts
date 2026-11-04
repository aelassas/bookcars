import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'
import env from '@/config/env.config'

const strings = new LocalizedStrings({
  fr: {
    TITLE: "Conditions d'utilisation",
    TOS: `
Bienvenue chez ${env.WEBSITE_NAME} ! En accédant à notre site Web et en utilisant nos services, vous acceptez de vous conformer et d'être lié par les conditions d'utilisation suivantes. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser nos services.

1. Acceptation des conditions

En accédant ou en utilisant nos services, vous confirmez avoir lu, compris et accepté ces conditions d'utilisation et notre politique de confidentialité.

2. Utilisation de nos services

Vous acceptez d'utiliser nos services uniquement à des fins légales et d'une manière qui ne porte pas atteinte aux droits, ne restreint ni n'empêche quiconque d'utiliser nos services. Cela inclut le respect de toutes les lois et réglementations applicables.

3. Réservations et paiements

Lorsque vous effectuez une réservation avec ${env.WEBSITE_NAME}, vous acceptez de fournir des informations exactes et complètes. Tous les paiements doivent être effectués via notre système de paiement sécurisé. Une fois le paiement effectué, vous recevrez une confirmation de votre réservation.

4. Politique d'annulation

Les annulations effectuées 24 heures avant la date de location peuvent donner droit à un remboursement complet. Les annulations effectuées moins de 24 heures avant la date de location peuvent entraîner des frais d'annulation. Veuillez vous référer à notre politique d'annulation pour des informations détaillées.

5. Conditions de location

Toutes les locations sont soumises à nos conditions de location, qui incluent, sans s'y limiter, les restrictions d'âge, les exigences en matière de permis de conduire et les obligations d'assurance. Vous êtes responsable de vous assurer que vous remplissez toutes les conditions avant d'effectuer une réservation.

6. Limitation de responsabilité

${env.WEBSITE_NAME} ne sera pas responsable des dommages indirects, accessoires ou consécutifs découlant de votre utilisation de nos services. En aucun cas, notre responsabilité totale ne dépassera le montant que vous avez payé pour les services.

7. Modifications des conditions

Nous nous réservons le droit de modifier ces conditions de service à tout moment. Toute modification entrera en vigueur immédiatement après sa publication sur notre site Web. Votre utilisation continue de nos services après toute modification constitue votre acceptation des nouvelles conditions.

8. Loi applicable

Ces conditions de service seront régies et interprétées conformément aux lois. Tout litige découlant de ces conditions sera résolu devant les tribunaux.

9. Coordonnées

Si vous avez des questions concernant ces conditions d'utilisation, veuillez nous contacter à l'adresse ${env.CONTACT_EMAIL}. Nous sommes là pour vous aider pour toute demande relative à nos services.

10. Reconnaissance

En utilisant nos services, vous reconnaissez avoir lu et compris ces conditions d'utilisation et acceptez d'être lié par elles.    
    `,
  },
  en: {
    TITLE: 'Terms of Service',
    TOS: `
Welcome to ${env.WEBSITE_NAME}! By accessing our website and using our services, you agree to comply with and be bound by the following Terms of Service. If you do not agree to these terms, please do not use our services.


1. Acceptance of Terms

By accessing or using our services, you confirm that you have read, understood, and agree to these Terms of Service and our Privacy Policy.


2. Use of Our Services

You agree to use our services only for lawful purposes and in a manner that does not infringe the rights of, restrict, or inhibit anyone else's use of our services. This includes compliance with all applicable laws and regulations.


3. Reservations and Payments

When you make a reservation with ${env.WEBSITE_NAME}, you agree to provide accurate and complete information. All payments must be made through our secure payment system. Once payment is completed, you will receive a confirmation of your reservation.


4. Cancellation Policy

Cancellations made 24 hours before the rental date may be eligible for a full refund. Cancellations made less than 24 hours prior to the rental date may incur a cancellation fee. Please refer to our cancellation policy for detailed information.


5. Rental Conditions

All rentals are subject to our rental conditions, which include but are not limited to age restrictions, driver's license requirements, and insurance obligations. You are responsible for ensuring that you meet all requirements before making a reservation.


6. Limitation of Liability

${env.WEBSITE_NAME} shall not be liable for any indirect, incidental, or consequential damages arising out of your use of our services. In no event shall our total liability exceed the amount paid by you for the services.


7. Modifications to Terms

We reserve the right to modify these Terms of Service at any time. Any changes will be effective immediately upon posting on our website. Your continued use of our services following any changes constitutes your acceptance of the new terms.


8. Governing Law

These Terms of Service shall be governed by and construed in accordance with the laws. Any disputes arising out of these terms shall be resolved in the courts.


9. Contact Information

If you have any questions regarding these Terms of Service, please contact us at ${env.CONTACT_EMAIL}. We are here to help you with any inquiries related to our services.


10. Acknowledgment

By using our services, you acknowledge that you have read and understood these Terms of Service and agree to be bound by them.
    `,
  },
  es: {
    TITLE: 'Condiciones de uso',
    TOS: `
¡Bienvenido a ${env.WEBSITE_NAME}! Al acceder a nuestro sitio web y utilizar nuestros servicios, usted acepta cumplir y estar sujeto a los siguientes Términos de servicio. Si no acepta estos términos, no utilice nuestros servicios.

1. Aceptación de los términos

Al acceder o utilizar nuestros servicios, usted confirma que ha leído, comprendido y acepta estos Términos de servicio y nuestra Política de privacidad.

2. Uso de nuestros servicios

Usted acepta utilizar nuestros servicios solo con fines legales y de una manera que no infrinja los derechos de terceros ni restrinja o inhiba el uso de nuestros servicios por parte de terceros. Esto incluye el cumplimiento de todas las leyes y regulaciones aplicables.

3. Reservas y pagos

Cuando hace una reserva con ${env.WEBSITE_NAME}, acepta proporcionar información precisa y completa. Todos los pagos deben realizarse a través de nuestro sistema de pago seguro. Una vez completado el pago, recibirá una confirmación de su reserva.

4. Política de cancelación

Las cancelaciones realizadas 24 horas antes de la fecha de alquiler pueden ser elegibles para un reembolso completo. Las cancelaciones realizadas con menos de 24 horas de antelación a la fecha de alquiler pueden generar un cargo por cancelación. Consulte nuestra política de cancelación para obtener información detallada.

5. Condiciones de alquiler

Todos los alquileres están sujetos a nuestras condiciones de alquiler, que incluyen, entre otras, restricciones de edad, requisitos de licencia de conducir y obligaciones de seguro. Usted es responsable de asegurarse de cumplir con todos los requisitos antes de realizar una reserva.

6. Limitación de responsabilidad

${env.WEBSITE_NAME} no será responsable de ningún daño indirecto, incidental o consecuente que surja de su uso de nuestros servicios. En ningún caso nuestra responsabilidad total excederá el monto que usted pagó por los servicios.

7. Modificaciones de los términos

Nos reservamos el derecho de modificar estos Términos de servicio en cualquier momento. Cualquier cambio entrará en vigencia inmediatamente después de su publicación en nuestro sitio web. Su uso continuo de nuestros servicios después de cualquier cambio constituye su aceptación de los nuevos términos.

8. Ley aplicable

Estos Términos de servicio se regirán e interpretarán de acuerdo con las leyes. Cualquier disputa que surja de estos términos se resolverá en los tribunales.

9. Información de contacto

Si tiene alguna pregunta sobre estos Términos de servicio, comuníquese con nosotros a ${env.CONTACT_EMAIL}. Estamos aquí para ayudarlo con cualquier consulta relacionada con nuestros servicios.

10. Reconocimiento

Al utilizar nuestros servicios, usted reconoce que ha leído y comprendido estos Términos de servicio y acepta regirse por ellos.    
    `,
  },
  de: {
    TITLE: 'Nutzungsbedingungen',
    TOS: `
Willkommen bei ${env.WEBSITE_NAME}! Indem Sie auf unsere Website zugreifen und unsere Dienste nutzen, erklären Sie sich damit einverstanden, die folgenden Nutzungsbedingungen einzuhalten und an sie gebunden zu sein. Wenn Sie diesen Bedingungen nicht zustimmen, nutzen Sie unsere Dienste bitte nicht.

1. Annahme der Bedingungen

Durch den Zugriff auf unsere Dienste oder deren Nutzung bestätigen Sie, dass Sie diese Nutzungsbedingungen und unsere Datenschutzerklärung gelesen und verstanden haben und ihnen zustimmen.

2. Nutzung unserer Dienste

Sie verpflichten sich, unsere Dienste nur für rechtmäßige Zwecke und in einer Weise zu nutzen, die weder die Rechte anderer verletzt noch deren Nutzung unserer Dienste einschränkt oder behindert. Dies schließt die Einhaltung aller geltenden Gesetze und Vorschriften ein.

3. Reservierungen und Zahlungen

Wenn Sie bei ${env.WEBSITE_NAME} eine Reservierung vornehmen, verpflichten Sie sich, genaue und vollständige Angaben zu machen. Alle Zahlungen müssen über unser sicheres Zahlungssystem erfolgen. Sobald die Zahlung abgeschlossen ist, erhalten Sie eine Bestätigung Ihrer Reservierung.

4. Stornierungsbedingungen

Stornierungen, die 24 Stunden vor dem Mietdatum erfolgen, berechtigen unter Umständen zu einer vollständigen Rückerstattung. Bei Stornierungen, die weniger als 24 Stunden vor dem Mietdatum erfolgen, kann eine Stornogebühr anfallen. Detaillierte Informationen finden Sie in unseren Stornierungsbedingungen.

5. Mietbedingungen

Alle Mietverträge unterliegen unseren Mietbedingungen, die unter anderem Altersbeschränkungen, Führerscheinanforderungen und Versicherungspflichten umfassen. Sie sind dafür verantwortlich sicherzustellen, dass Sie alle Voraussetzungen erfüllen, bevor Sie eine Reservierung vornehmen.

6. Haftungsbeschränkung

${env.WEBSITE_NAME} haftet nicht für mittelbare, zufällige oder Folgeschäden, die sich aus Ihrer Nutzung unserer Dienste ergeben. In keinem Fall übersteigt unsere Gesamthaftung den Betrag, den Sie für die Dienste bezahlt haben.

7. Änderungen der Bedingungen

Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern. Änderungen treten unmittelbar nach ihrer Veröffentlichung auf unserer Website in Kraft. Ihre fortgesetzte Nutzung unserer Dienste nach etwaigen Änderungen gilt als Ihre Zustimmung zu den neuen Bedingungen.

8. Anwendbares Recht

Diese Nutzungsbedingungen unterliegen den Gesetzen und werden in Übereinstimmung mit diesen ausgelegt. Alle Streitigkeiten, die sich aus diesen Bedingungen ergeben, werden vor den zuständigen Gerichten beigelegt.

9. Kontaktinformationen

Wenn Sie Fragen zu diesen Nutzungsbedingungen haben, kontaktieren Sie uns bitte unter ${env.CONTACT_EMAIL}. Wir helfen Ihnen gerne bei allen Anfragen zu unseren Diensten.

10. Anerkennung

Durch die Nutzung unserer Dienste bestätigen Sie, dass Sie diese Nutzungsbedingungen gelesen und verstanden haben und sich an sie gebunden erklären.
    `,
  },
  pt: {
    TITLE: 'Termos de Utilização',
    TOS: `
Bem-vindo à ${env.WEBSITE_NAME}! Ao aceder ao nosso website e utilizar os nossos serviços, concorda em cumprir e ficar vinculado aos seguintes Termos de Utilização. Se não concordar com estes termos, não utilize os nossos serviços.

1. Aceitação dos Termos

Ao aceder ou utilizar os nossos serviços, confirma que leu, compreendeu e aceita estes Termos de Utilização e a nossa Política de Privacidade.

2. Utilização dos Nossos Serviços

Concorda em utilizar os nossos serviços apenas para fins lícitos e de uma forma que não viole os direitos de terceiros, nem restrinja ou iniba a utilização dos nossos serviços por parte de terceiros. Isto inclui o cumprimento de todas as leis e regulamentos aplicáveis.

3. Reservas e Pagamentos

Quando efetua uma reserva na ${env.WEBSITE_NAME}, concorda em fornecer informações exatas e completas. Todos os pagamentos devem ser efetuados através do nosso sistema de pagamento seguro. Assim que o pagamento for concluído, receberá uma confirmação da sua reserva.

4. Política de Cancelamento

Os cancelamentos efetuados com 24 horas de antecedência em relação à data de aluguer podem dar direito a um reembolso total. Os cancelamentos efetuados com menos de 24 horas de antecedência em relação à data de aluguer podem implicar uma taxa de cancelamento. Consulte a nossa política de cancelamento para obter informações detalhadas.

5. Condições de Aluguer

Todos os alugueres estão sujeitos às nossas condições de aluguer, que incluem, entre outras, restrições de idade, requisitos de carta de condução e obrigações de seguro. É responsável por garantir que cumpre todos os requisitos antes de efetuar uma reserva.

6. Limitação de Responsabilidade

A ${env.WEBSITE_NAME} não será responsável por quaisquer danos indiretos, acidentais ou consequenciais decorrentes da sua utilização dos nossos serviços. Em nenhum caso a nossa responsabilidade total excederá o montante pago por si pelos serviços.

7. Alterações aos Termos

Reservamo-nos o direito de alterar estes Termos de Utilização a qualquer momento. Quaisquer alterações entram em vigor imediatamente após a sua publicação no nosso website. A sua utilização continuada dos nossos serviços após quaisquer alterações constitui a sua aceitação dos novos termos.

8. Lei Aplicável

Estes Termos de Utilização são regidos e interpretados de acordo com as leis. Quaisquer litígios decorrentes destes termos serão resolvidos nos tribunais.

9. Informações de Contacto

Se tiver alguma questão relativamente a estes Termos de Utilização, contacte-nos através do endereço ${env.CONTACT_EMAIL}. Estamos aqui para o ajudar com quaisquer questões relacionadas com os nossos serviços.

10. Reconhecimento

Ao utilizar os nossos serviços, reconhece que leu e compreendeu estes Termos de Utilização e concorda em ficar vinculado por eles.
    `,
  },
  it: {
    TITLE: 'Termini di servizio',
    TOS: `
Benvenuto su ${env.WEBSITE_NAME}! Accedendo al nostro sito web e utilizzando i nostri servizi, l'utente accetta di rispettare e di essere vincolato dai seguenti Termini di servizio. Se non si accettano tali termini, si prega di non utilizzare i nostri servizi.

1. Accettazione dei termini

Accedendo ai nostri servizi o utilizzandoli, l'utente conferma di aver letto, compreso e accettato i presenti Termini di servizio e la nostra Informativa sulla privacy.

2. Utilizzo dei nostri servizi

L'utente si impegna a utilizzare i nostri servizi esclusivamente per scopi leciti e in modo da non violare i diritti di terzi né limitare o impedire ad altri l'utilizzo dei nostri servizi. Ciò include il rispetto di tutte le leggi e i regolamenti applicabili.

3. Prenotazioni e pagamenti

Quando effettua una prenotazione con ${env.WEBSITE_NAME}, l'utente si impegna a fornire informazioni accurate e complete. Tutti i pagamenti devono essere effettuati tramite il nostro sistema di pagamento sicuro. Una volta completato il pagamento, l'utente riceverà una conferma della prenotazione.

4. Politica di cancellazione

Le cancellazioni effettuate 24 ore prima della data di noleggio possono dare diritto a un rimborso completo. Le cancellazioni effettuate meno di 24 ore prima della data di noleggio possono comportare l'addebito di una penale di cancellazione. Si prega di consultare la nostra politica di cancellazione per informazioni dettagliate.

5. Condizioni di noleggio

Tutti i noleggi sono soggetti alle nostre condizioni di noleggio, che comprendono, a titolo esemplificativo e non esaustivo, limiti di età, requisiti relativi alla patente di guida e obblighi assicurativi. L'utente è responsabile di verificare di soddisfare tutti i requisiti prima di effettuare una prenotazione.

6. Limitazione di responsabilità

${env.WEBSITE_NAME} non sarà responsabile per alcun danno indiretto, incidentale o consequenziale derivante dall'utilizzo dei nostri servizi. In nessun caso la nostra responsabilità complessiva supererà l'importo pagato dall'utente per i servizi.

7. Modifiche ai termini

Ci riserviamo il diritto di modificare i presenti Termini di servizio in qualsiasi momento. Eventuali modifiche avranno effetto immediato dal momento della loro pubblicazione sul nostro sito web. L'utilizzo continuato dei nostri servizi dopo eventuali modifiche costituisce accettazione dei nuovi termini.

8. Legge applicabile

I presenti Termini di servizio sono disciplinati e interpretati in conformità alle leggi. Qualsiasi controversia derivante dai presenti termini sarà risolta dinanzi ai tribunali.

9. Informazioni di contatto

Per qualsiasi domanda relativa ai presenti Termini di servizio, si prega di contattarci all'indirizzo ${env.CONTACT_EMAIL}. Siamo a disposizione per assistere l'utente in caso di qualsiasi richiesta relativa ai nostri servizi.

10. Riconoscimento

Utilizzando i nostri servizi, l'utente riconosce di aver letto e compreso i presenti Termini di servizio e accetta di esserne vincolato.
    `,
  },
  zh: {
    TITLE: '服务条款',
    TOS: `
欢迎使用 ${env.WEBSITE_NAME}！访问我们的网站并使用我们的服务，即表示您同意遵守并受以下服务条款的约束。如果您不同意这些条款，请勿使用我们的服务。

1. 条款的接受

访问或使用我们的服务，即表示您确认已阅读、理解并同意本服务条款及我们的隐私政策。

2. 服务的使用

您同意仅出于合法目的使用我们的服务，且不得侵犯他人的权利，不得限制或妨碍任何其他人使用我们的服务。这包括遵守所有适用的法律和法规。

3. 预订与付款

当您通过 ${env.WEBSITE_NAME} 进行预订时，您同意提供准确且完整的信息。所有款项必须通过我们的安全支付系统支付。付款完成后，您将收到预订确认。

4. 取消政策

在租赁日期前 24 小时取消的订单，可能有资格获得全额退款。在租赁日期前不足 24 小时取消的订单，可能需要支付取消费用。详细信息请参阅我们的取消政策。

5. 租赁条件

所有租赁均须遵守我们的租赁条件，包括但不限于年龄限制、驾驶证要求和保险义务。您有责任在进行预订之前确保自己满足所有要求。

6. 责任限制

对于因您使用我们的服务而产生的任何间接、附带或后果性损害，${env.WEBSITE_NAME} 不承担责任。在任何情况下，我们的全部责任均不超过您为相关服务所支付的金额。

7. 条款的修改

我们保留随时修改本服务条款的权利。任何修改在发布于我们的网站后立即生效。在任何修改之后您继续使用我们的服务，即视为您接受新的条款。

8. 适用法律

本服务条款受相关法律管辖并依其解释。因本条款引起的任何争议，应由法院解决。

9. 联系方式

如果您对本服务条款有任何疑问，请通过 ${env.CONTACT_EMAIL} 与我们联系。对于与我们的服务相关的任何咨询，我们都乐意为您提供帮助。

10. 确认

使用我们的服务，即表示您确认已阅读并理解本服务条款，并同意受其约束。
    `,
  },
  ja: {
    TITLE: '利用規約',
    TOS: `
${env.WEBSITE_NAME} へようこそ！当社のウェブサイトにアクセスし、当社のサービスをご利用になることにより、お客様は以下の利用規約を遵守し、これに拘束されることに同意したものとみなされます。これらの規約に同意されない場合は、当社のサービスをご利用にならないでください。

1. 規約の承諾

当社のサービスにアクセスまたはご利用になることにより、お客様は、本利用規約および当社のプライバシーポリシーを読み、理解し、同意したことを確認するものとします。

2. サービスの利用

お客様は、当社のサービスを適法な目的でのみ、かつ、他者の権利を侵害したり、他の誰かによる当社のサービスの利用を制限または妨げたりしない方法でご利用いただくことに同意するものとします。これには、適用されるすべての法令および規則の遵守が含まれます。

3. 予約と支払い

${env.WEBSITE_NAME} で予約を行う際、お客様は正確かつ完全な情報を提供することに同意するものとします。すべての支払いは、当社の安全な決済システムを通じて行う必要があります。支払いが完了すると、予約確認が送信されます。

4. キャンセルポリシー

レンタル日の 24 時間前までに行われたキャンセルは、全額返金の対象となる場合があります。レンタル日の 24 時間前を過ぎて行われたキャンセルには、キャンセル料が発生する場合があります。詳細については、当社のキャンセルポリシーをご確認ください。

5. レンタル条件

すべてのレンタルは、当社のレンタル条件の適用を受けます。これには、年齢制限、運転免許証の要件、保険加入義務などが含まれますが、これらに限定されません。お客様は、予約を行う前にすべての要件を満たしていることを確認する責任を負います。

6. 責任の制限

${env.WEBSITE_NAME} は、お客様による当社のサービスの利用に起因する間接的、付随的または結果的損害について、一切責任を負いません。いかなる場合も、当社の責任の総額は、お客様がサービスに対して支払った金額を超えないものとします。

7. 規約の変更

当社は、本利用規約をいつでも変更する権利を留保します。変更は、当社のウェブサイトに掲載された時点で直ちに効力を生じます。変更後も当社のサービスを引き続きご利用になった場合、お客様は新しい規約に同意したものとみなされます。

8. 準拠法

本利用規約は、法律に準拠し、これに従って解釈されます。本規約に起因または関連する紛争は、裁判所において解決されるものとします。

9. お問い合わせ先

本利用規約に関するご質問は、${env.CONTACT_EMAIL} までご連絡ください。当社のサービスに関するあらゆるお問い合わせについて、喜んでサポートいたします。

10. 確認事項

当社のサービスをご利用になることにより、お客様は、本利用規約を読み、理解し、これに拘束されることに同意したことを確認するものとします。
    `,
  },
})
langHelper.setLanguage(strings)
export { strings }
