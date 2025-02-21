import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

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
})

langHelper.setLanguage(strings)
export { strings }
