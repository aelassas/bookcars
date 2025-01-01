import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    REQUIRED_FIELD: 'Veuillez renseigner le champ : ',
    REQUIRED_FIELDS: 'Veuillez renseigner les champs : ',
  },
  en: {
    REQUIRED_FIELD: 'Please fill in the field: ',
    REQUIRED_FIELDS: 'Please fill in the fields: ',
  },
})

langHelper.setLanguage(strings)
export { strings }
