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
  de: {
    REQUIRED_FIELD: 'Bitte füllen Sie das Feld aus: ',
    REQUIRED_FIELDS: 'Bitte füllen Sie die Felder aus: ',
  },
  pt: {
    REQUIRED_FIELD: 'Preencha o campo: ',
    REQUIRED_FIELDS: 'Preencha os campos: ',
  },
  it: {
    REQUIRED_FIELD: 'Compilare il campo: ',
    REQUIRED_FIELDS: 'Compilare i campi: ',
  },
  zh: {
    REQUIRED_FIELD: '请填写以下字段：',
    REQUIRED_FIELDS: '请填写以下字段：',
  },
  ja: {
    REQUIRED_FIELD: '次の項目を入力してください：',
    REQUIRED_FIELDS: '次の項目を入力してください：',
  },
})

langHelper.setLanguage(strings)
export { strings }
