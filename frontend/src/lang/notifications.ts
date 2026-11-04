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
  de: {
    EMPTY_LIST: 'Keine Benachrichtigungen',
    VIEW: 'Ansehen',
    MARK_AS_READ: 'Als gelesen markieren',
    MARK_AS_UNREAD: 'Als ungelesen markieren',
    MARK_ALL_AS_READ: 'Alle als gelesen markieren',
    MARK_ALL_AS_UNREAD: 'Alle als ungelesen markieren',
    DELETE_ALL: 'Alle löschen',
    DELETE_NOTIFICATION: 'Sind Sie sicher, dass Sie diese Benachrichtigung löschen möchten?',
    DELETE_NOTIFICATIONS: 'Sind Sie sicher, dass Sie diese Benachrichtigungen löschen möchten?',
  },
  pt: {
    EMPTY_LIST: 'Sem notificações',
    VIEW: 'Ver',
    MARK_AS_READ: 'Marcar como lida',
    MARK_AS_UNREAD: 'Marcar como não lida',
    MARK_ALL_AS_READ: 'Marcar todas como lidas',
    MARK_ALL_AS_UNREAD: 'Marcar todas como não lidas',
    DELETE_ALL: 'Eliminar tudo',
    DELETE_NOTIFICATION: 'Tem a certeza de que pretende eliminar esta notificação?',
    DELETE_NOTIFICATIONS: 'Tem a certeza de que pretende eliminar estas notificações?',
  },
})

langHelper.setLanguage(strings)
export { strings }
