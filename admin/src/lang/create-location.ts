import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_LOCATION_HEADING: 'Nouveau lieu',
    LOCATION_NAME: 'Lieu',
    INVALID_LOCATION: 'Ce lieu existe déjà.',
    LOCATION_CREATED: 'Lieu créé avec succès.',
    COUNTRY: 'Pays',
    PARKING_SPOTS: 'Places de parking',
    PARENT_LOCATION: 'Lieu Parent',
  },
  en: {
    NEW_LOCATION_HEADING: 'New location',
    LOCATION_NAME: 'Location',
    INVALID_LOCATION: 'This location already exists.',
    LOCATION_CREATED: 'Location created successfully.',
    COUNTRY: 'Country',
    PARKING_SPOTS: 'Parking spots',
    PARENT_LOCATION: 'Parent Location',
  },
  es: {
    NEW_LOCATION_HEADING: 'Nuevo lugar',
    LOCATION_NAME: 'Lugar',
    INVALID_LOCATION: 'Este lugar ya existe.',
    LOCATION_CREATED: 'Lugar creado con éxito.',
    COUNTRY: 'País',
    PARKING_SPOTS: 'Plazas de aparcamiento',
    PARENT_LOCATION: 'Ubicación de los Padres',
  },
  de: {
    NEW_LOCATION_HEADING: 'Neuer Standort',
    LOCATION_NAME: 'Standort',
    INVALID_LOCATION: 'Dieser Standort existiert bereits.',
    LOCATION_CREATED: 'Standort erfolgreich erstellt.',
    COUNTRY: 'Land',
    PARKING_SPOTS: 'Parkplätze',
    PARENT_LOCATION: 'Übergeordneter Standort',
  },
  pt: {
    NEW_LOCATION_HEADING: 'Novo local',
    LOCATION_NAME: 'Local',
    INVALID_LOCATION: 'Este local já existe.',
    LOCATION_CREATED: 'Local criado com sucesso.',
    COUNTRY: 'País',
    PARKING_SPOTS: 'Lugares de estacionamento',
    PARENT_LOCATION: 'Local principal',
  },
  it: {
    NEW_LOCATION_HEADING: 'Nuova sede',
    LOCATION_NAME: 'Sede',
    INVALID_LOCATION: 'Questa sede esiste già.',
    LOCATION_CREATED: 'Sede creata con successo.',
    COUNTRY: 'Paese',
    PARKING_SPOTS: 'Posti auto',
    PARENT_LOCATION: 'Sede principale',
  },
  zh: {
    NEW_LOCATION_HEADING: '新增地点',
    LOCATION_NAME: '地点',
    INVALID_LOCATION: '该地点已存在。',
    LOCATION_CREATED: '地点创建成功。',
    COUNTRY: '国家',
    PARKING_SPOTS: '停车位',
    PARENT_LOCATION: '上级地点',
  },
  ja: {
    NEW_LOCATION_HEADING: '新しい拠点',
    LOCATION_NAME: '拠点',
    INVALID_LOCATION: 'この拠点は既に存在します。',
    LOCATION_CREATED: '拠点を作成しました。',
    COUNTRY: '国',
    PARKING_SPOTS: '駐車スペース',
    PARENT_LOCATION: '親拠点',
  },
})

langHelper.setLanguage(strings)
export { strings }
