import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SETTINGS_UPDATED: 'Paramètres modifiés avec succès.',
    NETWORK_SETTINGS: 'Paramètres Réseau',
    SETTINGS_EMAIL_NOTIFICATIONS: 'Activer les notifications par email',
  },
  en: {
    SETTINGS_UPDATED: 'Settings updated successfully.',
    NETWORK_SETTINGS: 'Network settings',
    SETTINGS_EMAIL_NOTIFICATIONS: 'Enable email notifications',
  },
  es: {
    SETTINGS_UPDATED: 'Configuración actualizada correctamente.',
    NETWORK_SETTINGS: 'Configuración de red',
    SETTINGS_EMAIL_NOTIFICATIONS: 'Habilitar notificaciones por correo electrónico',
  },
  de: {
    SETTINGS_UPDATED: 'Einstellungen erfolgreich aktualisiert.',
    NETWORK_SETTINGS: 'Netzwerkeinstellungen',
    SETTINGS_EMAIL_NOTIFICATIONS: 'E-Mail-Benachrichtigungen aktivieren',
  },
  pt: {
    SETTINGS_UPDATED: 'Definições atualizadas com sucesso.',
    NETWORK_SETTINGS: 'Definições de rede',
    SETTINGS_EMAIL_NOTIFICATIONS: 'Ativar notificações por e-mail',
  },
})

langHelper.setLanguage(strings)
export { strings }
