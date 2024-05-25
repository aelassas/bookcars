import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

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
  el: {
    SETTINGS_UPDATED: 'Οι ρυθμίσεις ενημερώθηκαν με επιτυχία',
    NETWORK_SETTINGS: 'Ρυθμίσεις δικτύου',
    SETTINGS_EMAIL_NOTIFICATIONS: 'Ενεργοποίηση ειδοποιήσεων ηλεκτρονικού ταχυδρομείου',
  },
})

langHelper.setLanguage(strings)
export { strings }
