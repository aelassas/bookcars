import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    START_DATE: 'Date de début',
    END_DATE: 'Date de fin',
    DAILY_PRICE: 'Prix par jour',
    NEW_DATE_BASED_PRICE: 'Nouveau prix par date',
  },
  en: {
    START_DATE: 'Start Date',
    END_DATE: 'End Date',
    DAILY_PRICE: 'Daily Price',
    NEW_DATE_BASED_PRICE: 'New Date Based Price',
  },
  es: {
    START_DATE: 'Fecha de inicio',
    END_DATE: 'Fecha de finalización',
    DAILY_PRICE: 'Precio diario',
    NEW_DATE_BASED_PRICE: 'Nuevo precio por fecha',
  },
  de: {
    START_DATE: 'Startdatum',
    END_DATE: 'Enddatum',
    DAILY_PRICE: 'Tagespreis',
    NEW_DATE_BASED_PRICE: 'Neuer datumsbasierter Preis',
  },
  pt: {
    START_DATE: 'Data de início',
    END_DATE: 'Data de fim',
    DAILY_PRICE: 'Preço diário',
    NEW_DATE_BASED_PRICE: 'Novo preço por data',
  },
  it: {
    START_DATE: 'Data di inizio',
    END_DATE: 'Data di fine',
    DAILY_PRICE: 'Prezzo giornaliero',
    NEW_DATE_BASED_PRICE: 'Nuovo prezzo per data',
  },
  zh: {
    START_DATE: '开始日期',
    END_DATE: '结束日期',
    DAILY_PRICE: '日价格',
    NEW_DATE_BASED_PRICE: '新增按日期定价',
  },
  ja: {
    START_DATE: '開始日',
    END_DATE: '終了日',
    DAILY_PRICE: '1日あたりの料金',
    NEW_DATE_BASED_PRICE: '新しい日付別料金',
  },
})

langHelper.setLanguage(strings)
export { strings }
