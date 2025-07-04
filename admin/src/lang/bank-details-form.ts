import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    BANK_DETAILS: 'Détails bancaires',
    ACCOUNT_HOLDER: 'Titulaire du compte',
    BANK_NAME: 'Nom de la banque',
    IBAN: 'IBAN',
    SWIFT_BIC: 'SWIFT/BIC',
    SHOW_BANK_DETAILS_PAGE: 'Afficher la page des détails bancaires',
  },
  en: {
    BANK_DETAILS: 'Bank Details',
    ACCOUNT_HOLDER: 'Account Holder',
    BANK_NAME: 'Bank Name',
    IBAN: 'IBAN',
    SWIFT_BIC: 'SWIFT/BIC',
    SHOW_BANK_DETAILS_PAGE: 'Show Bank Details Page',
  },
  es: {
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
