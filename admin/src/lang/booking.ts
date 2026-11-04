import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    TOTAL: 'Total :',
    DELETE_BOOKING: 'Êtes-vous sûr de vouloir supprimer cette réservation ?',
  },
  en: {
    TOTAL: 'Total:',
    DELETE_BOOKING: 'Are you sure you want to delete this booking?',
  },
  es: {
    TOTAL: 'Total:',
    DELETE_BOOKING: '¿Estás seguro de que quieres eliminar esta reserva?',
  },
  de: {
    TOTAL: 'Gesamt:',
    DELETE_BOOKING: 'Sind Sie sicher, dass Sie diese Buchung löschen möchten?',
  },
  pt: {
    TOTAL: 'Total:',
    DELETE_BOOKING: 'Tem a certeza de que pretende eliminar esta reserva?',
  },
  it: {
    TOTAL: 'Totale:',
    DELETE_BOOKING: 'Eliminare questa prenotazione?',
  },
  zh: {
    TOTAL: '总计：',
    DELETE_BOOKING: '您确定要删除此预订吗？',
  },
  ja: {
    TOTAL: '合計：',
    DELETE_BOOKING: 'この予約を削除してもよろしいですか？',
  },
})

langHelper.setLanguage(strings)
export { strings }
