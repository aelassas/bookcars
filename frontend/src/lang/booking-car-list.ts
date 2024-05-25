import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    REQUIRED_FIELD: 'Veuillez renseigner le champ : ',
    REQUIRED_FIELDS: 'Veuillez renseigner les champs : ',
  },
  en: {
    REQUIRED_FIELD: 'Please fill in the field: ',
    REQUIRED_FIELDS: 'Please fill in the fields: ',
  },
  el: {
     REQUIRED_FIELD: 'Παρακαλώ συμπληρώστε το πεδίο: ',
     REQUIRED_FIELDS: 'Παρακαλώ συμπληρώστε τα πεδία: ',
   },
})

langHelper.setLanguage(strings)
export { strings }
