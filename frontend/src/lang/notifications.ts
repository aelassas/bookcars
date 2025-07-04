import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    EMPTY_LIST: 'Pas de notifications',
    VIEW: 'Consulter',
    MARK_AS_READ: 'Marquer comme lu',
    MARK_AS_UNREAD: 'Marquer comme non lu',
    MARK_ALL_AS_READ: 'Tout marquer comme lu',
    MARK_ALL_AS_UNREAD: 'Tout marquer comme non lu',
    DELETE_ALL: 'Tout supprimer',
    DELETE_NOTIFICATION: 'Êtes-vous sûr de vouloir supprimer cette notification ?',
    DELETE_NOTIFICATIONS: 'Êtes-vous sûr de vouloir supprimer ces notifications ?',
  },
  en: {
    EMPTY_LIST: 'No notifications',
    VIEW: 'View',
    MARK_AS_READ: 'Mark as read',
    MARK_AS_UNREAD: 'Mark as unread',
    MARK_ALL_AS_READ: 'Mark all as read',
    MARK_ALL_AS_UNREAD: 'Mark all as unread',
    DELETE_ALL: 'Delete all',
    DELETE_NOTIFICATION: 'Are you sure you want to delete this notification?',
    DELETE_NOTIFICATIONS: 'Are you sure you want to delete these notifications?',
  },
  es: {
    EMPTY_LIST: 'No hay notificaciones',
    VIEW: 'Ver',
    MARK_AS_READ: 'Marcar como leído',
    MARK_AS_UNREAD: 'Marcar como no leído',
    MARK_ALL_AS_READ: 'Marcar todo como leíd',
    MARK_ALL_AS_UNREAD: 'Marcar todo como no leíd',
    DELETE_ALL: 'Eliminar todo',
    DELETE_NOTIFICATION: '¿Está seguro de que desea eliminar esta notificación?',
    DELETE_NOTIFICATIONS: '¿Está seguro de que desea eliminar estas notificaciones?',
  },
})

langHelper.setLanguage(strings)
export { strings }
