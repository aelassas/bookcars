import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'
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
})

langHelper.setLanguage(strings)
export { strings }
