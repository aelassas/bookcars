import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    REQUIRED_FIELD: 'Veuillez renseigner le champ : ',
    REQUIRED_FIELDS: 'Veuillez renseigner les champs : ',
  },
  en: {
    REQUIRED_FIELD: 'Please fill in the field: ',
    REQUIRED_FIELDS: 'Please fill in the fields: ',
  },
  es: {
    REQUIRED_FIELD: 'Por favor, complete el campo: ',
    REQUIRED_FIELDS: 'Por favor, complete los campos: ',
  },
})

langHelper.setLanguage(strings)
export { strings }
