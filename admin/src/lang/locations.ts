import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_LOCATION: 'Nouveau lieu',
    DELETE_LOCATION: 'Êtes-vous sûr de vouloir supprimer ce lieu ?',
    CANNOT_DELETE_LOCATION: 'Ce lieu ne peut pas être supprimé car il est lié à des lieux ou voitures.',
    EMPTY_LIST: 'Pas de lieux.',
    LOCATION: 'lieu',
    LOCATIONS: 'lieux',
  },
  en: {
    NEW_LOCATION: 'New location',
    DELETE_LOCATION: 'Are you sure you want to delete this location?',
    CANNOT_DELETE_LOCATION: 'This location cannot be deleted because it is related to child locations or cars.',
    EMPTY_LIST: 'No locations.',
    LOCATION: 'location',
    LOCATIONS: 'locations',
  },
  es: {
    NEW_LOCATION: 'Nuevo lugar',
    DELETE_LOCATION: '¿Estás seguro de que quieres eliminar este lugar?',
    CANNOT_DELETE_LOCATION: 'Este lugar no puede ser eliminado porque está relacionado con ubicaciones o coches.',
    EMPTY_LIST: 'No hay lugares.',
    LOCATION: 'lugar',
    LOCATIONS: 'lugares',
  },
  de: {
    NEW_LOCATION: 'Neuer Standort',
    DELETE_LOCATION: 'Sind Sie sicher, dass Sie diesen Standort löschen möchten?',
    CANNOT_DELETE_LOCATION: 'Dieser Standort kann nicht gelöscht werden, da er mit untergeordneten Standorten oder Fahrzeugen verknüpft ist.',
    EMPTY_LIST: 'Keine Standorte.',
    LOCATION: 'Standort',
    LOCATIONS: 'Standorte',
  },
  pt: {
    NEW_LOCATION: 'Novo local',
    DELETE_LOCATION: 'Tem a certeza de que pretende eliminar este local?',
    CANNOT_DELETE_LOCATION: 'Este local não pode ser eliminado porque está associado a locais subordinados ou a carros.',
    EMPTY_LIST: 'Sem locais.',
    LOCATION: 'local',
    LOCATIONS: 'locais',
  },
  it: {
    NEW_LOCATION: 'Nuova sede',
    DELETE_LOCATION: 'Sei sicuro di voler eliminare questa sede?',
    CANNOT_DELETE_LOCATION: 'Questa sede non può essere eliminata perché è collegata a sedi secondarie o ad auto.',
    EMPTY_LIST: 'Nessuna sede.',
    LOCATION: 'sede',
    LOCATIONS: 'sedi',
  },
  zh: {
    NEW_LOCATION: '新建地点',
    DELETE_LOCATION: '您确定要删除此地点吗？',
    CANNOT_DELETE_LOCATION: '此地点无法删除，因为它与下级地点或车辆相关联。',
    EMPTY_LIST: '暂无地点。',
    LOCATION: '地点',
    LOCATIONS: '地点',
  },
  ja: {
    NEW_LOCATION: '新規拠点',
    DELETE_LOCATION: 'この拠点を削除してもよろしいですか？',
    CANNOT_DELETE_LOCATION: 'この拠点は下位の拠点または車両に関連付けられているため、削除できません。',
    EMPTY_LIST: '拠点はありません。',
    LOCATION: '拠点',
    LOCATIONS: '拠点',
  },
})

langHelper.setLanguage(strings)
export { strings }
