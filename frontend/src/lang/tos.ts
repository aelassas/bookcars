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
Willkommen bei ${env.WEBSITE_NAME}! Indem Sie auf unsere Website zugreifen und unsere Dienste nutzen, erklären Sie sich damit einverstanden, die folgenden Nutzungsbedingungen einzuhalten und an sie gebunden zu sein. Wenn Sie diese Bedingungen nicht akzeptieren, nutzen Sie unsere Dienste bitte nicht.

1. Annahme der Bedingungen

Indem Sie auf unsere Dienste zugreifen oder sie nutzen, bestätigen Sie, dass Sie diese Nutzungsbedingungen und unsere Datenschutzerklärung gelesen und verstanden haben und ihnen zustimmen.

2. Nutzung unserer Dienste

Sie erklären sich damit einverstanden, unsere Dienste nur zu rechtmäßigen Zwecken und in einer Weise zu nutzen, die die Rechte anderer nicht verletzt und die Nutzung unserer Dienste durch andere weder einschränkt noch behindert. Dies umfasst die Einhaltung aller geltenden Gesetze und Vorschriften.

3. Reservierungen und Zahlungen

Wenn Sie bei ${env.WEBSITE_NAME} eine Reservierung vornehmen, erklären Sie sich damit einverstanden, genaue und vollständige Angaben zu machen. Alle Zahlungen müssen über unser sicheres Zahlungssystem erfolgen. Sobald die Zahlung abgeschlossen ist, erhalten Sie eine Bestätigung Ihrer Reservierung.

4. Stornierungsbedingungen

Stornierungen, die 24 Stunden vor dem Mietdatum erfolgen, können Anspruch auf eine vollständige Rückerstattung begründen. Bei Stornierungen, die weniger als 24 Stunden vor dem Mietdatum erfolgen, kann eine Stornogebühr anfallen. Detaillierte Informationen entnehmen Sie bitte unseren Stornierungsbedingungen.

5. Mietbedingungen

Alle Mietverträge unterliegen unseren Mietbedingungen, die unter anderem Altersbeschränkungen, Anforderungen an den Führerschein und Versicherungspflichten umfassen. Sie sind dafür verantwortlich, sicherzustellen, dass Sie alle Anforderungen erfüllen, bevor Sie eine Reservierung vornehmen.

6. Haftungsbeschränkung

${env.WEBSITE_NAME} haftet nicht für indirekte, zufällige oder Folgeschäden, die sich aus Ihrer Nutzung unserer Dienste ergeben. In keinem Fall übersteigt unsere Gesamthaftung den Betrag, den Sie für die Dienste bezahlt haben.

7. Änderungen der Bedingungen

Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern. Änderungen treten unmittelbar nach ihrer Veröffentlichung auf unserer Website in Kraft. Ihre fortgesetzte Nutzung unserer Dienste nach Änderungen gilt als Ihre Zustimmung zu den neuen Bedingungen.

8. Anwendbares Recht

Diese Nutzungsbedingungen unterliegen den geltenden Gesetzen und werden in Übereinstimmung mit diesen ausgelegt. Alle Streitigkeiten, die sich aus diesen Bedingungen ergeben, werden vor den Gerichten beigelegt.

9. Kontaktinformationen

Wenn Sie Fragen zu diesen Nutzungsbedingungen haben, kontaktieren Sie uns bitte unter ${env.CONTACT_EMAIL}. Wir helfen Ihnen gerne bei allen Anfragen zu unseren Diensten.

10. Anerkennung

Durch die Nutzung unserer Dienste bestätigen Sie, dass Sie diese Nutzungsbedingungen gelesen und verstanden haben und sich damit einverstanden erklären, an sie gebunden zu sein.
    `,
  },
  pt: {
    TITLE: 'Termos de Serviço',
    TOS: `
Bem-vindo à ${env.WEBSITE_NAME}! Ao aceder ao nosso website e ao utilizar os nossos serviços, o utilizador concorda em cumprir os seguintes Termos de Serviço e em ficar vinculado aos mesmos. Caso não concorde com estes termos, não utilize os nossos serviços.

1. Aceitação dos Termos

Ao aceder ou utilizar os nossos serviços, o utilizador confirma que leu, compreendeu e aceita estes Termos de Serviço e a nossa Política de Privacidade.

2. Utilização dos Nossos Serviços

O utilizador compromete-se a utilizar os nossos serviços apenas para fins lícitos e de uma forma que não viole os direitos de terceiros nem restrinja ou iniba a utilização dos nossos serviços por parte de terceiros. Tal inclui o cumprimento de todas as leis e regulamentos aplicáveis.

3. Reservas e Pagamentos

Ao efetuar uma reserva com a ${env.WEBSITE_NAME}, o utilizador compromete-se a fornecer informações exatas e completas. Todos os pagamentos devem ser efetuados através do nosso sistema de pagamento seguro. Uma vez concluído o pagamento, receberá uma confirmação da sua reserva.

4. Política de Cancelamento

Os cancelamentos efetuados com 24 horas de antecedência relativamente à data de aluguer podem dar direito a reembolso integral. Os cancelamentos efetuados com menos de 24 horas de antecedência relativamente à data de aluguer podem estar sujeitos a uma taxa de cancelamento. Consulte a nossa política de cancelamento para obter informações detalhadas.

5. Condições de Aluguer

Todos os alugueres estão sujeitos às nossas condições de aluguer, que incluem, entre outras, restrições de idade, requisitos relativos à carta de condução e obrigações em matéria de seguro. O utilizador é responsável por garantir que cumpre todos os requisitos antes de efetuar uma reserva.

6. Limitação de Responsabilidade

A ${env.WEBSITE_NAME} não será responsável por quaisquer danos indiretos, acidentais ou consequenciais decorrentes da sua utilização dos nossos serviços. Em caso algum a nossa responsabilidade total excederá o montante pago pelo utilizador pelos serviços.

7. Alterações aos Termos

Reservamo-nos o direito de alterar estes Termos de Serviço a qualquer momento. Quaisquer alterações produzem efeitos imediatamente após a sua publicação no nosso website. A continuação da utilização dos nossos serviços após quaisquer alterações constitui a aceitação dos novos termos.

8. Lei Aplicável

Os presentes Termos de Serviço são regidos e interpretados em conformidade com a lei aplicável. Quaisquer litígios decorrentes destes termos serão resolvidos nos tribunais.

9. Informações de Contacto

Caso tenha alguma questão relativa a estes Termos de Serviço, contacte-nos através do endereço ${env.CONTACT_EMAIL}. Estamos ao seu dispor para o ajudar em qualquer pedido de informação relacionado com os nossos serviços.

10. Reconhecimento

Ao utilizar os nossos serviços, o utilizador reconhece que leu e compreendeu estes Termos de Serviço e concorda em ficar vinculado aos mesmos.
    `,
  },
  it: {
    TITLE: 'Termini di servizio',
    TOS: `
Benvenuto su ${env.WEBSITE_NAME}! Accedendo al nostro sito web e utilizzando i nostri servizi, l'utente accetta di rispettare e di essere vincolato dai seguenti Termini di servizio. Qualora non accetti tali termini, si prega di non utilizzare i nostri servizi.

1. Accettazione dei Termini

Accedendo ai nostri servizi o utilizzandoli, l'utente conferma di aver letto, compreso e accettato i presenti Termini di servizio e la nostra Informativa sulla privacy.

2. Utilizzo dei Nostri Servizi

L'utente si impegna a utilizzare i nostri servizi esclusivamente per finalità lecite e in modo da non violare i diritti di terzi né limitare o impedire ad altri l'utilizzo dei nostri servizi. Ciò include il rispetto di tutte le leggi e i regolamenti applicabili.

3. Prenotazioni e Pagamenti

Effettuando una prenotazione con ${env.WEBSITE_NAME}, l'utente si impegna a fornire informazioni accurate e complete. Tutti i pagamenti devono essere effettuati tramite il nostro sistema di pagamento sicuro. Una volta completato il pagamento, l'utente riceverà una conferma della propria prenotazione.

4. Politica di Cancellazione

Le cancellazioni effettuate almeno 24 ore prima della data di noleggio possono dare diritto a un rimborso integrale. Le cancellazioni effettuate meno di 24 ore prima della data di noleggio possono comportare l'applicazione di una penale di cancellazione. Si prega di consultare la nostra politica di cancellazione per informazioni dettagliate.

5. Condizioni di Noleggio

Tutti i noleggi sono soggetti alle nostre condizioni di noleggio, che comprendono, a titolo esemplificativo e non esaustivo, le limitazioni di età, i requisiti relativi alla patente di guida e gli obblighi assicurativi. L'utente è responsabile di verificare di soddisfare tutti i requisiti prima di effettuare una prenotazione.

6. Limitazione di Responsabilità

${env.WEBSITE_NAME} non sarà responsabile per alcun danno indiretto, incidentale o consequenziale derivante dall'utilizzo dei nostri servizi da parte dell'utente. In nessun caso la nostra responsabilità complessiva potrà eccedere l'importo pagato dall'utente per i servizi.

7. Modifiche ai Termini

Ci riserviamo il diritto di modificare i presenti Termini di servizio in qualsiasi momento. Qualsiasi modifica avrà efficacia immediata dal momento della pubblicazione sul nostro sito web. L'utilizzo continuato dei nostri servizi dopo qualsiasi modifica costituisce accettazione dei nuovi termini.

8. Legge Applicabile

I presenti Termini di servizio sono disciplinati e interpretati in conformità alla legge applicabile. Qualsiasi controversia derivante dai presenti termini sarà risolta dinanzi ai tribunali competenti.

9. Informazioni di Contatto

Per qualsiasi domanda relativa ai presenti Termini di servizio, si prega di contattarci all'indirizzo ${env.CONTACT_EMAIL}. Siamo a disposizione per assistere l'utente in relazione a qualsiasi richiesta riguardante i nostri servizi.

10. Riconoscimento

Utilizzando i nostri servizi, l'utente riconosce di aver letto e compreso i presenti Termini di servizio e accetta di essere vincolato da essi.
    `,
  },
  zh: {
    TITLE: '服务条款',
    TOS: `
欢迎使用 ${env.WEBSITE_NAME}！访问我们的网站并使用我们的服务，即表示您同意遵守并受以下服务条款的约束。如果您不同意这些条款，请勿使用我们的服务。

1. 条款的接受

访问或使用我们的服务，即表示您确认已阅读、理解并同意这些服务条款以及我们的隐私政策。

2. 我们服务的使用

您同意仅出于合法目的并以不侵犯他人权利、不限制或妨碍他人使用我们服务的方式使用我们的服务。这包括遵守所有适用的法律法规。

3. 预订与付款

当您通过 ${env.WEBSITE_NAME} 进行预订时，您同意提供准确且完整的信息。所有款项必须通过我们的安全支付系统支付。付款完成后，您将收到预订确认。

4. 取消政策

在租赁日期前 24 小时取消的订单，可能有资格获得全额退款。在租赁日期前不足 24 小时取消的订单，可能需要支付取消费用。详细信息请参阅我们的取消政策。

5. 租赁条件

所有租赁均须遵守我们的租赁条件，包括但不限于年龄限制、驾驶执照要求和保险义务。您有责任在预订之前确保自己满足所有要求。

6. 责任限制

对于因您使用我们的服务而产生的任何间接、附带或后果性损害，${env.WEBSITE_NAME} 概不承担责任。在任何情况下，我们的总责任均不得超过您为相关服务所支付的金额。

7. 条款的修改

我们保留随时修改这些服务条款的权利。任何更改自发布在我们网站上之时起立即生效。在任何更改之后您继续使用我们的服务，即视为您接受新的条款。

8. 适用法律

这些服务条款受适用法律管辖并依其解释。因这些条款引起的任何争议均应提交有管辖权的法院解决。

9. 联系信息

如果您对这些服务条款有任何疑问，请通过 ${env.CONTACT_EMAIL} 与我们联系。对于与我们服务相关的任何咨询，我们都乐意为您提供帮助。

10. 确认

使用我们的服务，即表示您确认已阅读并理解这些服务条款，并同意受其约束。
    `,
  },
  ja: {
    TITLE: '利用規約',
    TOS: `
${env.WEBSITE_NAME} へようこそ！当社のウェブサイトにアクセスし、当社のサービスを利用することにより、お客様は以下の利用規約を遵守し、これに拘束されることに同意したものとみなされます。これらの規約に同意されない場合は、当社のサービスをご利用にならないでください。

1. 規約の承諾

当社のサービスにアクセスまたは利用することにより、お客様は、本利用規約および当社のプライバシーポリシーを読み、理解し、これに同意したことを確認するものとします。

2. 当社サービスの利用

お客様は、当社のサービスを適法な目的のためにのみ、かつ他者の権利を侵害せず、他者による当社サービスの利用を制限または妨げない方法で利用することに同意するものとします。これには、適用されるすべての法令の遵守が含まれます。

3. 予約と支払い

${env.WEBSITE_NAME} で予約を行う際、お客様は正確かつ完全な情報を提供することに同意するものとします。すべての支払いは、当社の安全な決済システムを通じて行わなければなりません。支払いが完了すると、予約の確認通知が送信されます。

4. キャンセルポリシー

レンタル日の24時間前までに行われたキャンセルは、全額返金の対象となる場合があります。レンタル日の24時間前を過ぎてから行われたキャンセルには、キャンセル料が発生する場合があります。詳細については、当社のキャンセルポリシーをご参照ください。

5. レンタル条件

すべてのレンタルは、当社のレンタル条件に従うものとし、これには、年齢制限、運転免許証の要件、保険上の義務が含まれますが、これらに限られません。お客様は、予約を行う前にすべての要件を満たしていることを確認する責任を負います。

6. 責任の制限

${env.WEBSITE_NAME} は、お客様による当社サービスの利用に起因または関連する間接的損害、付随的損害、または結果的損害について、一切責任を負いません。いかなる場合においても、当社の責任の総額は、お客様が当該サービスに対して支払った金額を超えないものとします。

7. 規約の変更

当社は、本利用規約をいつでも変更する権利を留保します。変更は、当社のウェブサイトに掲載された時点で直ちに効力を生じます。変更後も引き続き当社のサービスを利用された場合、新しい規約に同意したものとみなされます。

8. 準拠法

本利用規約は、適用される法律に準拠し、これに従って解釈されます。本規約に起因する紛争は、管轄裁判所において解決されるものとします。

9. お問い合わせ先

本利用規約に関するご質問は、${env.CONTACT_EMAIL} までご連絡ください。当社のサービスに関するお問い合わせには、誠意をもって対応いたします。

10. 確認事項

当社のサービスを利用することにより、お客様は、本利用規約を読み、理解し、これに拘束されることに同意したことを確認するものとします。
    `,
  },
})

langHelper.setLanguage(strings)
export { strings }
