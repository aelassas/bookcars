import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
    fr: {
        SETTINGS_UPDATED: 'Paramètres modifiés avec succès.',
        NETWORK_SETTINGS: 'Paramètres Réseau',
        SETTINGS_EMAIL_NOTIFICATIONS: 'Activer les notifications par email'
    },
    en: {
        SETTINGS_UPDATED: 'Settings updated successfully.',
        NETWORK_SETTINGS: 'Network settings',
        SETTINGS_EMAIL_NOTIFICATIONS: 'Enable email notifications'
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)
