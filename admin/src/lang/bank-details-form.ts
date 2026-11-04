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
  de: {
    BANK_DETAILS: 'Bankverbindung',
    ACCOUNT_HOLDER: 'Kontoinhaber',
    BANK_NAME: 'Name der Bank',
    IBAN: 'IBAN',
    SWIFT_BIC: 'SWIFT/BIC',
    SHOW_BANK_DETAILS_PAGE: 'Seite mit Bankverbindung anzeigen',
  },
  pt: {
    BANK_DETAILS: 'Dados bancários',
    ACCOUNT_HOLDER: 'Titular da conta',
    BANK_NAME: 'Nome do banco',
    IBAN: 'IBAN',
    SWIFT_BIC: 'SWIFT/BIC',
    SHOW_BANK_DETAILS_PAGE: 'Mostrar a página de dados bancários',
  },
  it: {
    BANK_DETAILS: 'Dati bancari',
    ACCOUNT_HOLDER: 'Intestatario del conto',
    BANK_NAME: 'Nome della banca',
    IBAN: 'IBAN',
    SWIFT_BIC: 'SWIFT/BIC',
    SHOW_BANK_DETAILS_PAGE: 'Mostra la pagina dei dati bancari',
  },
  zh: {
    BANK_DETAILS: '银行信息',
    ACCOUNT_HOLDER: '账户持有人',
    BANK_NAME: '银行名称',
    IBAN: 'IBAN',
    SWIFT_BIC: 'SWIFT/BIC',
    SHOW_BANK_DETAILS_PAGE: '显示银行信息页面',
  },
  ja: {
    BANK_DETAILS: '銀行口座情報',
    ACCOUNT_HOLDER: '口座名義人',
    BANK_NAME: '銀行名',
    IBAN: 'IBAN',
    SWIFT_BIC: 'SWIFT/BIC',
    SHOW_BANK_DETAILS_PAGE: '銀行口座情報ページを表示',
  },
})

langHelper.setLanguage(strings)
export { strings }
