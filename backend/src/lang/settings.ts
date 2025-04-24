import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SETTINGS_UPDATED: 'Paramètres modifiés avec succès.',
    NETWORK_SETTINGS: 'Paramètres Réseau',
    SETTINGS_EMAIL_NOTIFICATIONS: 'Activer les notifications par email',

    BANK_DETAILS: 'Détails bancaires',
    ACCOUNT_HOLDER: 'Titulaire du compte',
    BANK_NAME: 'Nom de la banque',
    IBAN: 'IBAN',
    SWIFT_BIC: 'SWIFT/BIC',
    SHOW_BANK_DETAILS_PAGE: 'Afficher la page des détails bancaires',
  },
  en: {
    SETTINGS_UPDATED: 'Settings updated successfully.',
    NETWORK_SETTINGS: 'Network settings',
    SETTINGS_EMAIL_NOTIFICATIONS: 'Enable email notifications',

    BANK_DETAILS: 'Bank Details',
    ACCOUNT_HOLDER: 'Account Holder',
    BANK_NAME: 'Bank Name',
    IBAN: 'IBAN',
    SWIFT_BIC: 'SWIFT/BIC',
    SHOW_BANK_DETAILS_PAGE: 'Show Bank Details Page',
  },
  es: {
    SETTINGS_UPDATED: 'Configuración actualizada correctamente.',
    NETWORK_SETTINGS: 'Configuración de red',
    SETTINGS_EMAIL_NOTIFICATIONS: 'Habilitar notificaciones por correo electrónico',

    BANK_DETAILS: 'Detalles bancarios',
    ACCOUNT_HOLDER: 'Titular de la cuenta',
    BANK_NAME: 'Nombre del banco',
    IBAN: 'IBAN',
    SWIFT_BIC: 'SWIFT/BIC',
    SHOW_BANK_DETAILS_PAGE: 'Mostrar la página de detalles bancarios',
  },
})

langHelper.setLanguage(strings)
export { strings }
