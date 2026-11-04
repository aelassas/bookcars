import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_COUNTRY_HEADING: 'Nouveau pays',
    COUNTRY_NAME: 'Pays',
    INVALID_COUNTRY: 'Ce pays existe déjà.',
    COUNTRY_CREATED: 'Pays créé avec succès.',
  },
  en: {
    NEW_COUNTRY_HEADING: 'New country',
    COUNTRY_NAME: 'Country',
    INVALID_COUNTRY: 'This country already exists.',
    COUNTRY_CREATED: 'Country created successfully.',
  },
  es: {
    NEW_COUNTRY_HEADING: 'Nuevo país',
    COUNTRY_NAME: 'País',
    INVALID_COUNTRY: 'Este país ya existe.',
    COUNTRY_CREATED: 'País creado con éxito.',
  },
  de: {
    NEW_COUNTRY_HEADING: 'Neues Land',
    COUNTRY_NAME: 'Land',
    INVALID_COUNTRY: 'Dieses Land existiert bereits.',
    COUNTRY_CREATED: 'Land erfolgreich erstellt.',
  },
  pt: {
    NEW_COUNTRY_HEADING: 'Novo país',
    COUNTRY_NAME: 'País',
    INVALID_COUNTRY: 'Este país já existe.',
    COUNTRY_CREATED: 'País criado com sucesso.',
  },
  it: {
    NEW_COUNTRY_HEADING: 'Nuovo paese',
    COUNTRY_NAME: 'Paese',
    INVALID_COUNTRY: 'Questo paese esiste già.',
    COUNTRY_CREATED: 'Paese creato con successo.',
  },
  zh: {
    NEW_COUNTRY_HEADING: '新增国家',
    COUNTRY_NAME: '国家',
    INVALID_COUNTRY: '该国家已存在。',
    COUNTRY_CREATED: '国家创建成功。',
  },
  ja: {
    NEW_COUNTRY_HEADING: '新しい国',
    COUNTRY_NAME: '国',
    INVALID_COUNTRY: 'この国は既に存在します。',
    COUNTRY_CREATED: '国を作成しました。',
  },
})

langHelper.setLanguage(strings)
export { strings }
